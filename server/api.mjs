import {analyzePhoto, surfaceKeys, validateRegions} from './regions.mjs';
import { ApiError, buildPrompt, validateDesign } from './design.mjs';
import { MAX_BODY_BYTES, MAX_RESPONSE_BYTES, validateImage } from './images.mjs';
import { secretMatches, tabletCredentials } from './pairing.mjs';
import { renderProfile } from './renderProfile.mjs';

const operatorAuthorized = (request, config, paired) => secretMatches(request.headers.get('x-visualizer-operator'), config.operatorToken) || secretMatches(request.headers.get('x-visualizer-operator'), paired?.operatorToken);

function authorize(request, config, paired) {
  const supplied = request.headers.get('authorization') || '';
  if (!secretMatches(supplied, `Bearer ${config.accessToken}`) && !(paired?.token && secretMatches(supplied, `Bearer ${paired.token}`))) {
    throw new ApiError(401, 'unauthorized', 'Ask your representative to connect this tablet before rendering.');
  }
}

async function readBounded(body, limit, tooLarge, signal) {
  if (!body) throw new ApiError(400, 'invalid_request', 'The request is empty.');
  const reader = body.getReader();
  const chunks = [];
  let length = 0;
  const onAbort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    for (;;) {
      if (signal?.aborted) throw new ApiError(408, 'upload_timeout', 'The photograph upload stopped. Please try again when your connection is ready.');
      const { done, value } = await reader.read();
      if (signal?.aborted) throw new ApiError(408, 'upload_timeout', 'The photograph upload stopped. Please try again when your connection is ready.');
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel().catch(() => {});
        throw tooLarge;
      }
      chunks.push(value);
    }
  } finally {
    signal?.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length).toString('utf8');
}

async function parseBody(request, maximum = MAX_BODY_BYTES) {
  if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type') || '')) throw new ApiError(415, 'unsupported_type', 'Send the photograph as a JSON request.');
  if (request.headers.has('content-encoding') && request.headers.get('content-encoding') !== 'identity') throw new ApiError(415, 'unsupported_encoding', 'Compressed requests are not supported.');
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) throw new ApiError(413, 'image_too_large', 'The prepared photograph must be smaller than 6 MB.');
  const uploadSignal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
  const value = await readBounded(request.body, maximum, new ApiError(413, 'image_too_large', 'The prepared photograph must be smaller than 6 MB.'), uploadSignal);
  try {
    return JSON.parse(value);
  } catch {
    throw new ApiError(400, 'invalid_json', 'The design could not be read. Please try again.');
  }
}

async function render(body, design, request, config, fetchImpl) {
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const signal = AbortSignal.any([request.signal, timeout]);
  const {model,quality} = renderProfile(config, design.quality);
  try {
    const upstream = await fetchImpl('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      redirect: 'manual',
      signal,
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: [{ image_url: body.image }, ...(design.correction ? [{image_url:design.correction.image}] : [])],
        prompt: buildPrompt(design.design, design.customPrompt, design),
        model,
        quality,
        size: 'auto',
        n: 1,
        output_format: 'webp',
        output_compression: 88,
      }),
    });
    if (!upstream.ok) {
      let providerCode;
      try {
        const failure = JSON.parse(await readBounded(upstream.body, 16 * 1024, new Error('Error body too large')));
        providerCode = failure?.error?.code;
      } catch { /* Provider error details are never returned or logged. */ }
      if (['insufficient_quota', 'credit_balance_exhausted', 'billing_hard_limit_reached'].includes(providerCode)) throw new ApiError(503, 'provider_billing', 'The image service needs API billing credits. Ask your representative to check the API account.');
      if (upstream.status === 429) throw new ApiError(429, 'provider_limit', 'The rendering service is busy. Please wait before trying again.', 60);
      if ([401, 403].includes(upstream.status)) throw new ApiError(503, 'provider_unavailable', 'Rendering needs attention from your representative. Your design has been kept.');
      throw new ApiError(502, 'render_failed', 'The rendering could not be completed. Your design has been kept.');
    }
    const text = await readBounded(upstream.body, MAX_RESPONSE_BYTES, new ApiError(502, 'invalid_result', 'The rendering service returned an unreadable image.'));
    const result = JSON.parse(text);
    const encoded = result?.data?.[0]?.b64_json;
    if (typeof encoded !== 'string') throw new ApiError(502, 'invalid_result', 'The rendering service returned an unreadable image.');
    let image;
    try {
      image = validateImage(`data:image/webp;base64,${encoded}`, 20 * 1024 * 1024);
    } catch {
      throw new ApiError(502, 'invalid_result', 'The rendering service returned an unreadable image.');
    }
    const usage={inputTextTokens:result.usage?.input_tokens_details?.text_tokens,inputImageTokens:result.usage?.input_tokens_details?.image_tokens,outputImageTokens:result.usage?.output_tokens_details?.image_tokens ?? result.usage?.output_tokens};
    const hasUsage=Object.values(usage).every(value=>Number.isSafeInteger(value) && value>=0 && value<=100_000_000);
    return { image, model, requestId: crypto.randomUUID(), ...(hasUsage?{usage}:{}) };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timeout.aborted) throw new ApiError(504, 'render_timeout', 'The rendering took too long. Your design is still here; try again when ready.');
    if (request.signal.aborted) throw new ApiError(499, 'cancelled', 'The rendering was cancelled.');
    throw new ApiError(502, 'render_failed', 'The rendering service could not be reached. Your design has been kept.');
  }
}

export function createApi({ config, catalog, reserve, reserveAnalysis = reserve, reserveConnection, consultations, fetchImpl = (input, init) => globalThis.fetch(input, init) }) {
  let busy = false;
  const paired = tabletCredentials(config);
  return async request => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Visualizer-Release': '2026-11-02.13', 'X-Visualizer-Render-Mode':config.fastTestMode ? 'fast-test' : 'standard', Vary: 'Origin' };
    const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });
    let acquired = false;
    try {
      const origin = request.headers.get('origin');
      if (origin) {
        if (!config.allowedOrigins.has(origin)) throw new ApiError(403, 'origin_denied', 'This portfolio address is not connected to the rendering service.');
        headers['Access-Control-Allow-Origin'] = origin;
      }
      const path = new URL(request.url).pathname;
      const consultationRoute=path==='/api/consultations' || path.startsWith('/api/consultations/');
      if (!consultationRoute && !['/api/health', '/api/session', '/api/render', '/api/connect', '/api/analyze'].includes(path)) throw new ApiError(404, 'not_found', 'This page was not found.');
      if (request.method === 'OPTIONS') {
        const method = request.headers.get('access-control-request-method');
        const requestedHeaders = (request.headers.get('access-control-request-headers') || '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
        if (!origin || !['GET', 'POST'].includes(method) || requestedHeaders.some(value => !['authorization', 'content-type', 'x-visualizer-operator'].includes(value))) throw new ApiError(403, 'preflight_denied', 'This request is not allowed.');
        headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
        headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-Visualizer-Operator';
        headers['Access-Control-Max-Age'] = '600';
        return new Response(null, { status: 204, headers });
      }
      if(consultationRoute && !['GET','POST'].includes(request.method))throw new ApiError(405,'method_not_allowed','This request method is not allowed.');
      if (!consultationRoute && (['/api/render','/api/connect','/api/analyze'].includes(path) ? request.method !== 'POST' : request.method !== 'GET')) throw new ApiError(405, 'method_not_allowed', 'This request method is not allowed.');
      if (path === '/api/health') return json({ configured: config.configured });
      if (!config.configured) throw new ApiError(503, 'not_configured', 'Ask your representative to connect the rendering service.');
      if (path === '/api/connect') {
        if (!origin) throw new ApiError(403, 'origin_denied', 'Connect from the portfolio app.');
        if (!paired || !reserveConnection) throw new ApiError(503, 'password_not_configured', 'Ask your representative to finish tablet password setup.');
        await reserveConnection(request);
        if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type') || '')) throw new ApiError(415, 'unsupported_type', 'Enter the tablet password to connect.');
        const text = await readBounded(request.body, 1024, new ApiError(413, 'invalid_password', 'Enter the tablet password to connect.'), AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]));
        let body;
        try { body = JSON.parse(text); } catch { throw new ApiError(400, 'invalid_password', 'Enter the tablet password to connect.'); }
        if (!body || Array.isArray(body) || typeof body.password !== 'string' || body.password.length > 128 || Object.keys(body).some(key => key !== 'password')) throw new ApiError(400, 'invalid_password', 'Enter the tablet password to connect.');
        if (!secretMatches(body.password.trim(), config.tabletPassword)) throw new ApiError(401, 'invalid_password', 'That password is incorrect. Please try again.');
        return json({ready:true, ...paired, operatorAuthorized:Boolean(paired.operatorToken)});
      }
      authorize(request, config, paired);
      if (path === '/api/session') return json({ ready: true, operatorAuthorized:operatorAuthorized(request, config, paired),...(consultations?{consultationsEnabled:true}:{}) });
      if(consultationRoute){if(!consultations)throw new ApiError(503,'sync_unavailable','Consultation sync is not configured.');return await consultations.handle(request,{operator:operatorAuthorized(request,config,paired),parseBody,json,headers});}
      if (busy) throw new ApiError(429, 'render_in_progress', 'A rendering is already being created. Please wait for it to finish.', 10);
      busy = true;
      acquired = true;
      const body = await parseBody(request, path==='/api/render' ? MAX_BODY_BYTES*2 : MAX_BODY_BYTES);
      if(path==='/api/analyze') {
        if(!body || Array.isArray(body) || Object.keys(body).some(key=>!['image','mode','feedback','previousRegions','imageSize'].includes(key)) || !Object.hasOwn(surfaceKeys,body.mode)) throw new ApiError(400,'invalid_analysis','Choose a kitchen or exterior photograph.');
        if(body.imageSize!==undefined && (!body.imageSize || Object.keys(body.imageSize).some(k=>!['width','height'].includes(k)) || ![body.imageSize.width,body.imageSize.height].every(n=>Number.isInteger(n)&&n>0&&n<=4096)))throw new ApiError(400,'invalid_analysis','This photo has invalid dimensions. Choose the photo again.');
        if(body.feedback!==undefined && (typeof body.feedback!=='string' || !body.feedback.trim() || body.feedback.length>1500)) throw new ApiError(400,'invalid_analysis','Describe the surface correction in up to 1,500 characters.');
        if(body.feedback && !operatorAuthorized(request,config,paired)) throw new ApiError(403,'operator_required','Surface corrections require representative access.');
        if(body.previousRegions!==undefined) body.previousRegions=validateRegions(body.previousRegions,body.mode);
        validateImage(body.image); await reserveAnalysis();
        return json(await analyzePhoto(body,request,config,fetchImpl,readBounded));
      }
      const design = validateDesign(body, catalog);
      if (design.quality === 'detail' && !operatorAuthorized(request, config, paired)) throw new ApiError(403,'operator_required','Detailed previews require representative access.');
      if (design.customPrompt && !operatorAuthorized(request, config, paired)) throw new ApiError(403, 'operator_required', 'Connect this tablet with the representative\'s password to use custom instructions.');
      if((design.correction || design.corrections.length) && !operatorAuthorized(request,config,paired)) throw new ApiError(403,'operator_required','Corrections require representative access.');
      if(design.correction) validateImage(design.correction.image);
      validateImage(body.image);
      // Reserve before making the billable request. Failed/aborted attempts also count.
      await reserve();
      return json(await render(body, design, request, config, fetchImpl));
    } catch (error) {
      const safe = error instanceof ApiError ? error : new ApiError(503, 'unavailable', 'Rendering is temporarily unavailable. Your design has been kept.');
      if (safe.retryAfter) headers['Retry-After'] = String(safe.retryAfter);
      return json({ error: { code: safe.code, message: safe.message } }, safe.status);
    } finally {
      if (acquired) busy = false;
    }
  };
}

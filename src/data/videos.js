// type is "local" or "youtube". YouTube requires an embed URL, never a watch URL.
export const videos = [
  {
    id: 'process-preview',
    title: 'A fresh finish, step by step',
    eyebrow: 'THE PROCESS',
    duration: '0:12',
    description:
      'A short animated sample: prepare, coat, and reveal. Replace with your own approved production footage.',
    type: 'local',
    url: 'media/videos/process-demo.mp4',
    thumbnail: 'media/projects/sage-kitchen-after.svg',
    captions: 'media/videos/process-demo.vtt',
    note: 'Illustrative animation · No audio',
  },
  {
    id: 'exterior-preview',
    title: 'See the exterior possibilities',
    eyebrow: 'THE TRANSFORMATION',
    duration: 'Preview',
    description:
      'This card is ready for an approved Spray-Net YouTube embed. Your salesperson can walk you through the exterior process in the meantime.',
    type: 'youtube',
    url: '',
    thumbnail: 'media/projects/white-brick-after.svg',
  },
];

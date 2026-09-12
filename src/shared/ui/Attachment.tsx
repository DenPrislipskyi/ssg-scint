import { cn } from '@/shared/lib/cn';
import { useLightbox } from '@/shared/ui/Lightbox';

const IMAGE_RE = /\.(jpe?g|png|gif|webp)$/i;

export const isImageAttachment = (name: string): boolean => IMAGE_RE.test(name);

/**
 * Джерело зображення вкладення.
 * Реальні файли лежать у public/mock-assets; для решти малюємо SVG-плейсхолдер
 * з назвою файлу — так само, як робив прототип.
 */
export const attachmentSrc = (name: string): string => {
  if (name === 'IMG_4412.jpg') return '/mock-assets/IMG_4412.jpg';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#e5e7eb"/><rect x="60" y="60" width="360" height="240" rx="12" fill="#9ca3af"/><text x="240" y="190" font-family="sans-serif" font-size="22" fill="#fff" text-anchor="middle">${name}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export interface AttachmentThumbProps {
  name: string;
  className?: string;
}

export const AttachmentThumb = ({ name, className }: AttachmentThumbProps) => {
  const lightbox = useLightbox();
  return (
    <img
      src={attachmentSrc(name)}
      alt={name}
      title={name}
      onClick={() => lightbox.open(attachmentSrc(name), name)}
      className={cn(
        'inline-block size-11 cursor-zoom-in rounded-md border border-line bg-sel object-cover align-middle',
        className,
      )}
    />
  );
};

export const AttachmentPill = ({ name }: { name: string }) => (
  <span className="mr-1 inline-block rounded-md border border-line bg-white px-2 py-0.5 text-xs">
    {name}
  </span>
);

/** Вкладення у списку: фото — мініатюрою, решта — плашкою. */
export const AttachmentList = ({ names }: { names: string[] }) => (
  <>
    {names.map((name) =>
      isImageAttachment(name) ? (
        <AttachmentThumb key={name} name={name} className="mt-2 mr-1.5" />
      ) : (
        <AttachmentPill key={name} name={name} />
      ),
    )}
  </>
);

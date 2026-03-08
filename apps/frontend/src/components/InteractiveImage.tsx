'use client';

export default function InteractiveImage({ src, alt, className }: any) {
    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
            onError={(e) => e.currentTarget.style.display = 'none'}
        />
    );
}

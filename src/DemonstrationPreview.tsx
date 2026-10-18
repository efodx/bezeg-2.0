import React, {useEffect, useRef, useState} from 'react';
import type {DemonstrationMotionAsset} from './demonstrationMotionAssets';
import './DemonstrationPreview.css';

export function DemonstrationPreview({src, motion, loading = 'lazy', className = '', focusTargetRef}: {
    src: string;
    motion?: DemonstrationMotionAsset;
    loading?: 'eager' | 'lazy';
    className?: string;
    focusTargetRef?: React.RefObject<HTMLElement | null>;
}) {
    const frameRef = useRef<HTMLSpanElement>(null);
    const imageGeneration = useRef(0);
    const [imageState, setImageState] = useState<'pending' | 'ready' | 'failed'>('pending');
    const [intersectionRatio, setIntersectionRatio] = useState(0);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [documentVisible, setDocumentVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
    const [hoverUnavailable, setHoverUnavailable] = useState(() => typeof window !== 'undefined'
        && window.matchMedia?.('(hover: none)').matches === true);
    const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);
    const shouldPlay = Boolean(motion) && (hoverUnavailable
        ? intersectionRatio >= 0.5
        : (hovered || focused) && intersectionRatio > 0) && documentVisible && !reducedMotion;

    useEffect(() => {
        const frame = frameRef.current;
        if (!frame || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(entries => {
            const entry = entries.find(item => item.target === frame);
            setIntersectionRatio(entry?.isIntersecting ? entry.intersectionRatio : 0);
        }, {threshold: [0, 0.5]});
        observer.observe(frame);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const frame = frameRef.current;
        const target = focusTargetRef?.current ?? frame?.parentElement?.closest<HTMLElement>('a, button') ?? null;
        if (!target) return;
        const activate = () => setFocused(true);
        const deactivate = () => setFocused(false);
        target.addEventListener('focus', activate);
        target.addEventListener('blur', deactivate);
        if (document.activeElement === target) activate();
        return () => {
            target.removeEventListener('focus', activate);
            target.removeEventListener('blur', deactivate);
        };
    }, [focusTargetRef]);

    useEffect(() => {
        const update = () => setDocumentVisible(!document.hidden);
        document.addEventListener('visibilitychange', update);
        return () => document.removeEventListener('visibilitychange', update);
    }, []);

    useEffect(() => {
        const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        if (!query) return;
        const update = () => setReducedMotion(query.matches);
        update();
        query.addEventListener?.('change', update);
        return () => query.removeEventListener?.('change', update);
    }, []);

    useEffect(() => {
        const query = window.matchMedia?.('(hover: none)');
        if (!query) return;
        const update = () => setHoverUnavailable(query.matches);
        update();
        query.addEventListener?.('change', update);
        return () => query.removeEventListener?.('change', update);
    }, []);

    useEffect(() => {
        const image = frameRef.current?.querySelector('img');
        const currentGeneration = ++imageGeneration.current;
        setImageState('pending');
        let settled = false;
        const reveal = () => { if (imageGeneration.current === currentGeneration && !settled) { settled = true; setImageState('ready'); } };
        const fail = () => { if (imageGeneration.current === currentGeneration && !settled) { settled = true; setImageState('failed'); } };
        const decode = () => {
            if (!image) return;
            if (typeof image.decode !== 'function') { if (image.naturalWidth > 0) reveal(); return; }
            void image.decode().then(reveal, () => { if (image.naturalWidth > 0) reveal(); });
        };
        if (image?.complete) image.naturalWidth > 0 ? decode() : fail();
        return () => { if (imageGeneration.current === currentGeneration) imageGeneration.current++; };
    }, [src]);

    return <span ref={frameRef} className={`demonstration-preview-media demonstrations-catalog-preview-frame ${className}`} aria-hidden="true"
        onPointerEnter={event => { if (event.pointerType !== 'touch') setHovered(true); }}
        onPointerLeave={event => { if (event.pointerType !== 'touch') setHovered(false); }}>
        <img className={`demonstration-preview-poster demonstrations-catalog-preview${imageState === 'ready' ? ' is-ready' : ''}${imageState === 'failed' ? ' is-failed' : ''}`}
            src={src} width="360" height="220" alt="" loading={loading}
            onLoad={event => {
                const image = event.currentTarget;
                const currentGeneration = imageGeneration.current;
                const reveal = () => { if (imageGeneration.current === currentGeneration) setImageState('ready'); };
                if (typeof image.decode !== 'function') { if (image.naturalWidth > 0) reveal(); return; }
                void image.decode().then(reveal, () => { if (image.naturalWidth > 0) reveal(); });
            }}
            onError={event => {
                if (event.currentTarget.getAttribute('src') === src) setImageState('failed');
            }}/>
        {shouldPlay && motion && <ActiveDemonstrationVideo key={motion.src} motion={motion}/>}
    </span>;
}

function ActiveDemonstrationVideo({motion}: {motion: DemonstrationMotionAsset}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [frameReady, setFrameReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const failedRef = useRef(false);
    const liveRef = useRef(true);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        let live = true;
        liveRef.current = true;
        const release = () => {
            video.pause();
            video.removeAttribute('src');
            video.load();
        };
        const fail = () => {
            if (!live || failedRef.current) return;
            failedRef.current = true;
            setFailed(true);
            setFrameReady(false);
            release();
        };
        video.src = motion.src;
        video.load();
        try {
            void Promise.resolve(video.play()).catch(fail);
        } catch { fail(); }
        return () => {
            live = false;
            liveRef.current = false;
            release();
        };
    }, [motion.src]);

    return <video ref={videoRef} className={`demonstration-preview-motion${frameReady && !failed ? ' is-frame-ready' : ''}`}
        autoPlay muted playsInline loop preload="none" aria-hidden="true" tabIndex={-1}
        onLoadedData={() => { if (liveRef.current && !failedRef.current) setFrameReady(true); }}
        onError={() => {
            if (!liveRef.current || failedRef.current) return;
            failedRef.current = true;
            setFailed(true);
            setFrameReady(false);
            videoRef.current?.pause();
            videoRef.current?.removeAttribute('src');
            videoRef.current?.load();
        }}/>
}

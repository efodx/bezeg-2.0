import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scene of the Fourier series chapter, keyed by example id (F1, which opens the partial sums lesson). */
export const fourierPreviewCopy = {
    'fourier-series.fourier-series.fourier-series': copy(
        'Pravokotni val \\(f\\) (črtkano) in delna vsota \\(S_1\\), en sam sinus, s točkama pri \\(x=1{,}57\\) in rdečo daljico med njima.',
        'The square wave \\(f\\) (dashed) and the partial sum \\(S_1\\), a single sine, with the points at \\(x=1.57\\) and a red segment between them.',
        'Pri \\(x=1{,}57\\) je \\(S_1=1{,}27324\\) nad vrednostjo vala \\(1\\); en sam sinus ne ujame vodoravnih delov vala.',
        'At \\(x=1.57\\) we have \\(S_1=1.27324\\), above the value \\(1\\) of the wave; a single sine does not catch the flat parts of the wave.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;

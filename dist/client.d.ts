type ImageLoaderProps = {
    src: string;
    width: number;
    quality?: number;
};
type ImageConfigComplete = {
    deviceSizes: number[];
    imageSizes: number[];
    path: string;
    unoptimized: boolean;
};
type ImageConfig = Partial<ImageConfigComplete>;

type ImageLoaderWithConfig = (p: ImageLoaderProps & {
    config: Readonly<ImageConfig>;
}) => string;
type GenImgAttrsData = {
    config: ImageConfig;
    src: string;
    unoptimized: boolean;
    loader: ImageLoaderWithConfig;
    width?: number;
    quality?: number;
    sizes?: string;
};
type GenImgAttrsResult = {
    src: string;
    srcSet: string | undefined;
    sizes: string | undefined;
};
declare function generateImgAttrs({ config, src, unoptimized, width, quality, sizes, loader, }: GenImgAttrsData): GenImgAttrsResult;
declare const imageConfigDefault: ImageConfigComplete;

export { type GenImgAttrsData, type GenImgAttrsResult, generateImgAttrs, imageConfigDefault };

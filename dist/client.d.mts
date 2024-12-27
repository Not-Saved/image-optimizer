import { ImageConfig, ImageLoaderProps } from './index.mjs';

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

export { type GenImgAttrsData, type GenImgAttrsResult, generateImgAttrs };

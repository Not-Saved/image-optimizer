export type ImageLoader = (p: ImageLoaderProps) => string;

export type ImageLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export type ImageConfigComplete = {
  deviceSizes: number[];
  imageSizes: number[];
  path: string;
  unoptimized: boolean;
};

export type ImageConfig = Partial<ImageConfigComplete>;

export type ActiveTab = 
  | 'layout' 
  | 'remove' 
  | 'compress' 
  | 'converter' 
  | 'mergeSplit' 
  | 'security' 
  | 'signWatermark'
  | 'apkConverter';

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  arrayBuffer?: ArrayBuffer;
  pageCount?: number;
  previewUrl?: string;
  isEncrypted?: boolean;
}

export type PaperSize = 'A4' | 'Original' | 'Custom' | 'A0' | 'A1' | 'A2' | 'A3' | 'A5' | 'A6' | 'Letter' | 'Legal' | 'B4' | 'B5';

export interface LayoutOptions {
  pagesPerSheet: number;
  pageSize: PaperSize;
  readingDirection: 'ltr' | 'rtl' | 'ttb';
  orientation: 'automatic' | 'portrait' | 'landscape';
  outerMarginMm: number;
  innerMarginMm: number;
  hasBorder: boolean;
  customWidth: number;
  customHeight: number;
  customUnit: 'mm' | 'cm' | 'inch';
}

export type CompressionPreset = '0.9' | '0.6' | '0.3' | 'target';

export interface JpgToPdfSettings {
  quality: number; // 0.72, 0.85, 1.0
  pageSize: 'a4-fixed' | 'auto' | 'equal-width-ratio' | 'letter-fixed' | 'custom';
  orientation: 'auto' | 'portrait' | 'landscape';
  margin: number;
  customMargin: number;
  customWidthMm: number;
  customHeightMm: number;
  mergeAll: boolean;
}

export interface SecurityOptions {
  mode: 'protect' | 'unlock';
  userPassword: string;
  confirmPassword?: string;
  ownerPassword?: string;
  permissions: {
    printing: 'full' | 'low' | 'none';
    modifying: 'none' | 'assembly' | 'form' | 'annotation' | 'all';
    copyExtract: 'y' | 'n';
  };
  samePasswordAll: boolean;
  filePasswords?: Record<string, string>;
}

export interface WatermarkOptions {
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
  rotationAngle: number;
  position: 'center' | 'header' | 'footer' | 'diagonal';
  includePageNumbers: boolean;
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'top-right';
  pageNumberFormat: 'page-of-total' | 'simple';
}

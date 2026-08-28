/**
 * CosmoDoc worksheet-media boundary.
 *
 * Intended for XLSX pictures, imported images,
 * pasted screenshots, and future evidence sheets.
 */

export interface CosmoMediaAnchor {
  row: number;
  column: number;
  offsetX?: number;
  offsetY?: number;
}

export interface CosmoMediaItem {
  id: string;
  kind: "image";
  source: string;
  anchor: CosmoMediaAnchor;
  width?: number;
  height?: number;
}
/**
 * CosmoDoc visual-style boundary.
 */

export interface CosmoAlignment {
  horizontal?: string;
  vertical?: string;
  wrapText?: boolean;
}

export interface CosmoFont {
  name?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
}

export interface CosmoCellStyle {
  font?: CosmoFont;
  alignment?: CosmoAlignment;
  numberFormat?: string;
}
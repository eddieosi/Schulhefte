export type RulingType =
  | 'kariert'       // 5mm Standard Mathe
  | 'kariert_gross' // 7mm Grundschule
  | 'liniert'       // Liniert Standard
  | 'liniert_rand'  // Liniert mit rotem Korrekturrand (Deutsch)
  | 'punkte'        // Dot Grid 5mm
  | 'blanko'        // Unliniert
  | 'vokabeln'      // 2 Spalten Vokabelheft mit Trennlinie
  | 'noten';        // Notenlinien

export type ToolType = 'pen' | 'pencil' | 'brush' | 'highlighter' | 'eraser' | 'text' | 'image' | 'pan' | 'fill' | 'shape';

export type ShapeType = 'rectangle' | 'rounded_rectangle' | 'circle' | 'triangle';

export interface ShapeElement {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'pencil' | 'brush' | 'highlighter' | 'eraser' | 'fill';
  color: string;
  size: number;
  opacity?: number;
  points: Point[];
  isStraight?: boolean;
}

export interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: 'sans' | 'handwriting' | 'serif' | 'comic';
}

export interface ImageElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
  caption?: string;
}

export interface Page {
  id: string;
  notebookId: string;
  pageNumber: number;
  ruling: RulingType;
  strokes: Stroke[];
  textboxes: TextBox[];
  images: ImageElement[];
  shapes?: ShapeElement[];
  ocrText?: string;
  updatedAt: string;
}

export interface Notebook {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  coverColor: string;
  coverPattern: 'standard' | 'vintage' | 'minimal' | 'leather' | 'marble';
  ruling: RulingType;
  pageIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  notebookId: string;
  notebookTitle: string;
  subject: string;
  coverColor: string;
  pageId: string;
  pageNumber: number;
  snippet: string;
}

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  notebookCount?: number;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export type ClimbType = 'Indoor Bouldering' | 'Indoor Top Rope' | 'Indoor Lead' | 'Outdoor Bouldering' | 'Outdoor Sport' | 'Outdoor Trad';

export interface Location {
  lat: number;
  lng: number;
  name: string;
}

export interface ClimbEntry {
  id: string;
  name: string;
  date: string;
  grade: string;
  type: ClimbType;
  location: Location;
  notes: string;
  sent: boolean;
  favorite?: boolean;
}

export interface GearReview {
  id: string;
  itemName: string;
  category: 'Shoes' | 'Harness' | 'Chalk' | 'Hardware' | 'Apparel' | 'Other';
  rating: number; // 1-5
  reviewText: string;
  price?: number;
  purchaseDate?: string;
}

export interface ChartDataPoint {
  date: string;
  gradeValue: number; // Numeric representation of grade for charting
  gradeLabel: string;
}
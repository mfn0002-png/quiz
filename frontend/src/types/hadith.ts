export type HadithGroup = 'nine_books' | 'selections';

export interface HadithCollection {
  id: string;
  name: string;
  arabicName: string;
  author: string;
  arabicAuthor?: string;
  group: HadithGroup;
  badge: string;
  totalHadiths: number;
  totalBooks: number;
  summary: string;
  gradient: string;
  icon: string;
  hasApi: boolean;
}

export interface HadithBook {
  bookNumber: number;
  title: string;
  englishTitle: string;
  hadithStart?: number | null;
  hadithEnd?: number | null;
  totalHadiths?: number | null;
}

export interface HadithGrade {
  name: string;
  grade: string;
}

export interface HadithItem {
  hadithNumber: number;
  arabicNumber?: number;
  arabicText: string;
  translation: string;
  englishTranslation?: string;
  frenchTranslation?: string;
  grades: HadithGrade[];
  reference: {
    book: number;
    hadith: number;
  };
}

export interface HadithBookResponse {
  collection: HadithCollection;
  books: HadithBook[];
}

export interface HadithsResponse {
  collectionId: string;
  bookNumber: number;
  count: number;
  hadiths: HadithItem[];
}

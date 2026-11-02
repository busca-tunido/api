import type {
  GenderPreference,
  Role,
  RoomType,
  StayDurationCategory,
  VerificationStatus,
} from '@prisma/client';
import type { TierKey } from './config.js';

export type DraftUser = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  role: Role;
  gender: 'MALE' | 'FEMALE';
  universityId: string | null;
};

export type DraftRoom = {
  id: string;
  roomNumber: string;
  title: string;
  description: string;
  type: RoomType;
  monthlyPrice: number;
  deposit: number | null;
  hasPrivateBathroom: boolean;
  totalBeds: number;
  availableBeds: number;
  isAvailable: boolean;
  images: string[];
};

export type DraftNearbyUniversity = {
  universityId: string;
  name: string;
  shortName: string | null;
  distanceMeters: number;
  walkingMinutes: number;
  transitMinutes: number;
};

export type DraftPensionImage = {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption: string;
  isFeatured: boolean;
  sortOrder: number;
};

export type DraftPension = {
  id: string;
  slug: string;
  title: string;
  description: string;
  address: string;
  city: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  contactName: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactEmail: string;
  baseMonthlyPrice: number;
  deposit: number;
  currency: string;
  waterIncluded: boolean;
  electricityIncluded: boolean;
  gasIncluded: boolean;
  internetIncluded: boolean;
  curfewTime: string | null;
  guestsAllowed: boolean;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  genderPreference: GenderPreference;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  verificationStatus: VerificationStatus;
  tier: TierKey;
  amenities: string[];
  rooms: DraftRoom[];
  images: DraftPensionImage[];
  nearbyUniversities: DraftNearbyUniversity[];
  landlordId: string;
};

export type DraftReview = {
  id: string;
  pensionId: string;
  userId: string;
  overallRating: number;
  cleanlinessRating: number;
  landlordRating: number;
  quietnessRating: number;
  wifiRating: number;
  comment: string;
  stayDurationCategory: StayDurationCategory;
  isResidentVerified: boolean;
  authorGender: 'MALE' | 'FEMALE';
  authorFirstName: string;
};

export type ReviewSituationItem = {
  aspect: string;
  comment: string;
};

export type SituationsCatalog = {
  pensions: {
    titlePrefixes: Record<TierKey, string[]>;
    descriptions: Record<TierKey, string[]>;
  };
  rooms: {
    SINGLE: {
      PRIVATE_BATH: string[];
      SHARED_BATH: string[];
    };
    SHARED: {
      PRIVATE_BATH: string[];
      SHARED_BATH: string[];
    };
    STUDIO: {
      PRIVATE_BATH: string[];
      SHARED_BATH: string[];
    };
  };
  reviews: Record<'1' | '2' | '3' | '4' | '5', ReviewSituationItem[]>;
};

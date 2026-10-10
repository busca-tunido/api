import type {
  GenderPreference,
  Role,
  RoomType,
  StayDurationCategory,
  VerificationStatus,
} from '@prisma/client';
import type { TierKey } from './config.js';

export interface DraftUser {
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
}

export interface DraftRoom {
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
}

export interface DraftNearbyUniversity {
  universityId: string;
  name: string;
  shortName: string | null;
  distanceMeters: number;
  walkingMinutes: number;
  transitMinutes: number;
}

export interface DraftPensionImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption: string;
  isFeatured: boolean;
  sortOrder: number;
}

export interface DraftPension {
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
}

export interface DraftReview {
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
}

export interface PensionAiPromptContext {
  id: string;
  city: string;
  neighborhood: string;
  tier: TierKey;
  nearestUniName: string;
  walkingMinutes: number;
  amenitiesList: string[];
  roomsSummary: string;
  rulesSummary: string;
  landlordName: string;
}

export interface ReviewAiPromptContext {
  id: string;
  city: string;
  nearestUniName: string;
  authorName: string;
  authorGender: 'MALE' | 'FEMALE';
  overallRating: number;
  sentiment: 'enojado' | 'neutral' | 'contento';
  highlightAspect: string;
}

export interface EnrichedSeedTextsCache {
  version: number;
  generatedAt: string;
  descriptions: Record<string, string>;
  reviews: Record<string, string>;
}

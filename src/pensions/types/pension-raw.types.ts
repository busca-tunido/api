export type PaginatedPensions<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  nearbyCityCounts: Array<{
    city: string;
    count: number;
    distanceKm?: number;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PriceHistogramBin = {
  min: number;
  max: number;
  count: number;
};

export type PriceHistogram = {
  minPrice: number | null;
  maxPrice: number | null;
  currency: string;
  totalListings: number;
  bins: PriceHistogramBin[];
};

export type CitySummaryItem = {
  id: string;
  name: string;
  pensionsCount: number;
  latitude: number;
  longitude: number;
  imageUrl?: string | null;
};

export type EmbeddedPensionImageRaw = {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
  createdAt?: Date;
};

export type EmbeddedRoomRaw = {
  id: string;
  roomNumber?: string | null;
  title: string;
  description?: string | null;
  type: string;
  monthlyPrice: number;
  deposit?: number | null;
  hasPrivateBathroom: boolean;
  totalBeds: number;
  availableBeds: number;
  isAvailable: boolean;
  isActive?: boolean;
  images: string[];
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

export type EmbeddedNearbyUniversityRaw = {
  universityId: string;
  name: string;
  shortName?: string | null;
  distanceMeters: number;
  walkingMinutes?: number | null;
  transitMinutes?: number | null;
};

export type PensionDocRaw = {
  id: string;
  slug: string;
  title: string;
  description: string;
  address: string;
  city: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  baseMonthlyPrice: number;
  deposit?: number | null;
  currency: string;
  waterIncluded: boolean;
  electricityIncluded: boolean;
  gasIncluded: boolean;
  internetIncluded: boolean;
  curfewTime?: string | null;
  guestsAllowed: boolean;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  genderPreference: string;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  verificationStatus: string;
  ratingAverage: number;
  ratingCount: number;
  communityScore: number;
  isActive: boolean;
  landlordId?: string | null;
  submittedById?: string | null;
  amenities?: string[];
  rooms?: EmbeddedRoomRaw[];
  images?: EmbeddedPensionImageRaw[];
  nearbyUniversities?: EmbeddedNearbyUniversityRaw[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  landlord?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
  _count?: {
    reviews?: number;
    proposals?: number;
  };
};

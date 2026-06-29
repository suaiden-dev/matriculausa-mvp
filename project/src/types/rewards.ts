export interface MatriculaRewardsStats {
  totalUsers: number;
  totalReferrals: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  conversionRate: number;
  averageCoinsPerUser: number;
  topReferrers: TopReferrer[];
  recentActivity: RecentActivity[];
  topStudentsByBalance: StudentSummary[];
  topStudentsBySpent: StudentSummary[];
  couponUsage: CouponUsageStats;
  couponUsageDetails: CouponUsageDetail[];
  recentRedemptions: RedemptionEntry[];
  referralList: ReferralEntry[];
}

export interface TopReferrer {
  userId: string;
  fullName: string;
  email: string;
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
}

export interface RecentActivity {
  id: string;
  type: 'referral' | 'redemption' | 'share' | 'click';
  userId: string;
  fullName: string;
  description: string;
  amount?: number;
  createdAt: string;
}

export interface StudentSummary {
  fullName: string;
  email: string;
  totalEarnings: number;
  totalSpent: number;
  currentBalance: number;
}

export interface CouponUsageStats {
  totalUsed: number;
  usedInRange: number;
}

export interface CouponUsageDetail {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  affiliateCode: string;
  referrerId: string;
  referrerEmail: string;
  referrerName: string;
  discountAmount: number;
  stripeCouponId: string;
  status: string;
  appliedAt: string | null;
  expiresAt: string | null;
}

export interface RedemptionEntry {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  rewardId: string;
  rewardName: string;
  costPaid: number;
  status: string;
  redeemedAt: string | null;
}

export interface ReferralEntry {
  id: string;
  fullName: string;
  email: string;
  referrerName: string;
  referrerCode: string;
  createdAt: string;
  isConverted: boolean;
}

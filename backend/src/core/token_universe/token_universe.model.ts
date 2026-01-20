/**
 * Token Universe Model
 * 
 * Registry of all tokens for analysis
 * Source: CoinGecko API
 */
import mongoose from 'mongoose';

const TokenUniverseSchema = new mongoose.Schema({
  // Identity
  symbol: {
    type: String,
    required: true,
    index: true,
    uppercase: true,
  },
  
  name: {
    type: String,
    required: true,
  },
  
  contractAddress: {
    type: String,
    required: true,
    lowercase: true,
  },
  
  chainId: {
    type: Number,
    required: true,
    default: 1, // Ethereum mainnet
  },
  
  decimals: {
    type: Number,
    default: 18,
  },
  
  // Market Data
  marketCap: {
    type: Number,
    required: true,
  },
  
  volume24h: {
    type: Number,
    required: true,
  },
  
  liquidity: {
    type: Number,
    required: false,
  },
  
  priceUsd: {
    type: Number,
    required: true,
  },
  
  // Metadata
  sector: {
    type: String,
    required: false,
  },
  
  category: {
    type: String,
    required: false,
  },
  
  coingeckoId: {
    type: String,
    required: false,
  },
  
  // Status
  active: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  // Source
  source: {
    type: String,
    enum: ['coingecko', 'cmc'],
    default: 'coingecko',
  },
  
  ingestedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'token_universe',
  timestamps: false,
});

// Indexes
TokenUniverseSchema.index({ symbol: 1 }, { unique: true });
TokenUniverseSchema.index({ contractAddress: 1, chainId: 1 }, { unique: true });
TokenUniverseSchema.index({ active: 1, marketCap: -1 });
TokenUniverseSchema.index({ lastUpdated: 1 });

export const TokenUniverseModel = mongoose.model('TokenUniverse', TokenUniverseSchema);

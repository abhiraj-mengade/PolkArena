import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { supabase } from "./supabase"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a short code for events (like Luma)
 * Format: 6-8 characters, alphanumeric, readable
 */
export function generateShortCode(eventName?: string): string {
  const characters = '23456789abcdefghjkmnpqrstuvwxyz'; // Removed confusing chars: 0,1,i,l,o
  let result = '';
  
  // If event name provided, use first 2-3 chars as prefix
  if (eventName) {
    const prefix = eventName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 3);
    if (prefix.length >= 2) {
      result = prefix;
    }
  }
  
  // Fill remaining with random characters
  const targetLength = 7;
  while (result.length < targetLength) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Generate a unique short code by checking database
 */
export async function generateUniqueShortCode(eventName?: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const shortCode = generateShortCode(eventName);
    
    // Check if code already exists
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .eq('short_code', shortCode)
      .single();
    
    console.log(data, error);
    if (error && error.code === 'PGRST116') {
      // No match found - code is available
      return shortCode;
    }
    
    attempts++;
  }
  
  // Fallback to completely random if all attempts failed
  return generateShortCode();
}

/**
 * Create shareable URLs for events
 */
export function createShareableEventURL(shortCode: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://polkarena.montaq.org');
  return `${base}/e/${shortCode}`;
}

/**
 * Extract short code from shareable URL
 */
export function extractShortCodeFromURL(url: string): string | null {
  const match = url.match(/\/e\/([a-z0-9]+)/i);
  return match ? match[1] : null;
}

/**
 * Format event duration with accurate hours and minutes
 */
export function formatEventDuration(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  const durationMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(durationMs / (1000 * 60));
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

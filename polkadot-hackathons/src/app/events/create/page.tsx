"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ensureUserProfile } from "@/lib/auth-utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Calendar, Globe, Plus, Trash2, Upload, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { generateUniqueShortCode } from "@/lib/utils";

interface CustomField {
  id: string;
  name: string;
  type: string;
  required: boolean;
  options?: string[];
}

// Image Upload Component
function ImageUpload({
  value,
  onChange,
  disabled = false,
  maxSize = 5,
}: {
  value?: string;
  onChange: (path: string | null) => void;
  disabled?: boolean;
  maxSize?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Get public URL for display
  const getImageUrl = (path: string) => {
    if (!path) return null;
    try {
      const { data } = supabase.storage
        .from('event-banners')
        .getPublicUrl(path);
      
      // Log for debugging
      console.log('Generated public URL for path:', path, '→', data.publicUrl);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error generating public URL:', error);
      return null;
    }
  };

  // Load existing image if value exists
  useEffect(() => {
    if (value) {
      const url = getImageUrl(value);
      if (url) {
        setPreview(url);
      }
    } else {
      setPreview(null);
    }
  }, [value]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Set preview immediately for better UX
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload file
      const { data, error } = await supabase.storage
        .from('event-banners')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // Enhanced error handling
        if (error.message.includes('Bucket not found')) {
          throw new Error('Storage bucket not configured. Please contact support.');
        }
        throw error;
      }

      // Update preview to use the uploaded image URL
      const uploadedImageUrl = getImageUrl(data.path);
      if (uploadedImageUrl) {
        setPreview(uploadedImageUrl);
      }

      onChange(data.path);
      toast.success('Image uploaded successfully!');
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
      // Reset preview on error
      setPreview(null);
    } finally {
      setUploading(false);
      // Clear the input to allow re-uploading the same file
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      // Delete from storage
      const { error } = await supabase.storage
        .from('event-banners')
        .remove([value]);

      if (error) {
        console.error('Delete error:', error);
      }

      onChange(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Image removed');
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove image');
    }
  };

  return (
    <div className="space-y-4">
      <Label>Event Banner Image</Label>
      
      {preview ? (
        <div className="relative">
          <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border">
            <img
              src={preview}
              alt="Event banner preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Image failed to load:', preview);
                console.error('Error details:', e);
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', preview);
              }}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemove}
            disabled={disabled || uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Upload an image for your event banner
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Maximum file size: {maxSize}MB
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          ref={fileInputRef} // Fixed: Use direct ref assignment instead of callback
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          className="hidden"
          id="image-upload"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {preview ? 'Change Image' : 'Upload Image'}
            </>
          )}
        </Button>
        
        {preview && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRemove}
            disabled={disabled || uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function CreateEventPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
    is_online: false,
    participant_limit: "",
    tags: "",
    registration_deadline: "",
    website_url: "",
    discord_url: "",
    twitter_url: "",
    requirements: "",
    banner_image_url: "",
  });

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Ensure user profile exists
      try {
        await ensureUserProfile(user.id);
      } catch (error) {
        console.error("Error ensuring user profile:", error);
        toast.error("Failed to load user profile");
        router.push("/auth/login");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    getUser();
  }, [router]);

  const addCustomField = () => {
    const newField: CustomField = {
      id: Date.now().toString(),
      name: "",
      type: "text",
      required: false,
      options: [],
    };
    setCustomFields([...customFields, newField]);
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(fields =>
      fields.map(field =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  const removeCustomField = (id: string) => {
    setCustomFields(fields => fields.filter(field => field.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      if (
        !formData.name ||
        !formData.description ||
        !formData.start_time ||
        !formData.end_time
      ) {
        toast.error("Please fill in all required fields");
        setSaving(false);
        return;
      }

      // Enhanced date validation
      console.log("Create form data dates:", {
        start_time: formData.start_time,
        end_time: formData.end_time,
        registration_deadline: formData.registration_deadline
      });

      const startTime = new Date(formData.start_time);
      const endTime = new Date(formData.end_time);
      const now = new Date();

      console.log("Create parsed dates:", {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        now: now.toISOString()
      });

      // Check for invalid dates
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        toast.error("Please enter valid start and end times");
        setSaving(false);
        return;
      }

      // Check if start time is in the past
      if (startTime.getTime() < now.getTime()) {
        toast.error("Start time cannot be in the past");
        setSaving(false);
        return;
      }

      if (endTime.getTime() <= startTime.getTime()) {
        toast.error("End time must be after start time");
        setSaving(false);
        return;
      }

      // Validate registration deadline if provided
      let registrationDeadline = null;
      if (formData.registration_deadline) {
        registrationDeadline = new Date(formData.registration_deadline);
        
        if (isNaN(registrationDeadline.getTime())) {
          toast.error("Please enter a valid registration deadline");
          setSaving(false);
          return;
        }

        if (registrationDeadline.getTime() >= startTime.getTime()) {
          toast.error("Registration deadline must be before start time");
          setSaving(false);
          return;
        }

        if (registrationDeadline.getTime() < now.getTime()) {
          toast.error("Registration deadline cannot be in the past");
          setSaving(false);
          return;
        }
      }

      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Get user profile for organizer name
      const { data: userProfile } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .single();

      // Generate unique short code for shareable URL
      const shortCode = await generateUniqueShortCode(formData.name);

      console.log("Creating event with data:", {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        registration_deadline: registrationDeadline?.toISOString() || null
      });

      const eventData = {
        name: formData.name,
        description: formData.description,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        organizer_id: user.id,
        organizer_name: userProfile?.name || user.email || "Anonymous",
        location: formData.location || null,
        is_online: formData.is_online,
        participant_limit: formData.participant_limit
          ? parseInt(formData.participant_limit)
          : null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        custom_fields: customFields.length > 0 ? customFields : null,
        registration_deadline: registrationDeadline?.toISOString() || null,
        website_url: formData.website_url || null,
        discord_url: formData.discord_url || null,
        twitter_url: formData.twitter_url || null,
        requirements: formData.requirements || null,
        banner_image_url: formData.banner_image_url || null,
        short_code: shortCode,
      };

      const { data, error } = await supabase
        .from("events")
        .insert(eventData)
        .select()
        .single();

      if (error) {
        console.error("Error creating event:", error);
        toast.error(`Failed to create event: ${error.message}`);
        setSaving(false);
        return;
      }

      toast.success("Event created successfully!");
      router.push(`/events/${data.id}`);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-polkadot-pink" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/events">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Events
                </Link>
              </Button>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Create Event
              </h1>
              <p className="text-muted-foreground">
                Organize an amazing Polkadot ecosystem event
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Provide the essential details about your event
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Polkadot Developer Workshop"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe your event, what participants will learn, and what to expect..."
                    rows={6}
                    required
                  />
                </div>

                {/* Image upload component */}
                <ImageUpload
                  value={formData.banner_image_url}
                  onChange={(path) =>
                    setFormData({ ...formData, banner_image_url: path || "" })
                  }
                  disabled={saving}
                  maxSize={5}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Format</Label>
                    <Select
                      value={formData.is_online ? "online" : "offline"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          is_online: value === "online",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="offline">In-Person</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      placeholder={formData.is_online ? "Meeting platform (e.g., Zoom)" : "City, Country or Venue"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    placeholder="e.g., workshop, beginner, substrate, defi"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Schedule & Capacity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Schedule & Capacity
                </CardTitle>
                <CardDescription>
                  Set the timeline and participant limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time *</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) =>
                        setFormData({ ...formData, start_time: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time *</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) =>
                        setFormData({ ...formData, end_time: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registration_deadline">
                      Registration Deadline
                    </Label>
                    <Input
                      id="registration_deadline"
                      type="datetime-local"
                      value={formData.registration_deadline}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          registration_deadline: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="participant_limit">Maximum Participants</Label>
                  <Input
                    id="participant_limit"
                    type="number"
                    value={formData.participant_limit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        participant_limit: e.target.value,
                      })
                    }
                    placeholder="Leave empty for unlimited"
                    min="1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom Registration Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Registration Form Fields</CardTitle>
                <CardDescription>
                  Add custom fields for participant registration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {customFields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-3 sm:p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Field #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCustomField(field.id)}
                        className="text-red-600 hover:text-red-700 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove field</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Field Label</Label>
                        <Input
                          value={field.name}
                          onChange={(e) =>
                            updateCustomField(field.id, { name: e.target.value })
                          }
                          placeholder="e.g., Experience Level"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Field Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value: string) =>
                            updateCustomField(field.id, { type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="textarea">Long Text</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Required</Label>
                        <Select
                          value={field.required ? "true" : "false"}
                          onValueChange={(value) =>
                            updateCustomField(field.id, { required: value === "true" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">Optional</SelectItem>
                            <SelectItem value="true">Required</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {field.type === "select" && (
                      <div className="space-y-2">
                        <Label>Options (comma-separated)</Label>
                        <Input
                          value={field.options?.join(", ") || ""}
                          onChange={(e) =>
                            updateCustomField(field.id, {
                              options: e.target.value.split(",").map(opt => opt.trim()).filter(opt => opt)
                            })
                          }
                          placeholder="e.g., Beginner, Intermediate, Advanced"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomField}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Field
                </Button>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>
                  Optional details and social links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={formData.requirements}
                    onChange={(e) =>
                      setFormData({ ...formData, requirements: e.target.value })
                    }
                    placeholder="Any prerequisites or requirements for participants..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website_url">Website</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          website_url: e.target.value,
                        })
                      }
                      placeholder="https://your-event.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discord_url">Discord</Label>
                    <Input
                      id="discord_url"
                      type="url"
                      value={formData.discord_url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discord_url: e.target.value,
                        })
                      }
                      placeholder="https://discord.gg/your-server"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter_url">Twitter</Label>
                    <Input
                      id="twitter_url"
                      type="url"
                      value={formData.twitter_url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          twitter_url: e.target.value,
                        })
                      }
                      placeholder="https://twitter.com/your-handle"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button asChild variant="outline">
                <Link href="/events">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-polkadot-pink hover:bg-polkadot-pink/90"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Create Event
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

// Individual Registration Schema
const individualRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().min(2, "Location is required"),
  contactNumber: z.string().regex(/^\d{10}$/, "Contact number must be 10 digits"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// NGO Registration Schema
const ngoRegisterSchema = z.object({
  ngoName: z.string().min(3, "NGO name must be at least 3 characters"),
  location: z.string().min(2, "Location is required"),
  ngoType: z.string().min(1, "Please select NGO type"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type IndividualFormValues = z.infer<typeof individualRegisterSchema>;
type NGOFormValues = z.infer<typeof ngoRegisterSchema>;
type FormValues = IndividualFormValues | NGOFormValues;

interface RegisterFormProps {
  userType: "individual" | "ngo" | "sponsor";
  onSuccess: () => void;
}

const NGO_TYPES = [
  { label: "Healthcare", value: "healthcare" },
  { label: "Education", value: "education" },
  { label: "Food & Nutrition", value: "food" },
  { label: "Water & Sanitation", value: "water" },
  { label: "Shelter & Housing", value: "shelter" },
  { label: "Disaster Relief", value: "disaster" },
  { label: "Community Development", value: "community" },
  { label: "Other", value: "other" },
];

export default function RegisterForm({ userType, onSuccess }: RegisterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { t } = useLanguage();

  const schema = userType === "ngo"
    ? ngoRegisterSchema
    : individualRegisterSchema;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: userType === "ngo"
      ? {
        ngoName: "",
        location: "",
        ngoType: "",
        email: "",
        password: "",
      }
      : {
        name: "",
        location: "",
        contactNumber: "",
        email: "",
        password: "",
      },
  });

  useEffect(() => {
    form.reset(
      userType === "ngo"
        ? {
          ngoName: "",
          location: "",
          ngoType: "",
          email: "",
          password: "",
        }
        : {
          name: "",
          location: "",
          contactNumber: "",
          email: "",
          password: "",
        },
    );
  }, [userType, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);

      const displayName = userType === "ngo"
        ? (values as NGOFormValues).ngoName
        : (values as IndividualFormValues).name;

      const result = await register({
        email: values.email,
        password: values.password,
        userType,
        name: userType === "ngo"
          ? (values as NGOFormValues).ngoName
          : (values as IndividualFormValues).name,
        location: values.location,
        contactNumber: userType === "ngo"
          ? undefined
          : (values as IndividualFormValues).contactNumber,
        ngoType: userType === "ngo" ? (values as NGOFormValues).ngoType : undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.needsEmailVerification) {
        toast.success(t("auth.accountCreatedNeedsVerification"));
        onSuccess();
        return;
      }

      toast.success(t("auth.welcomeUser", { name: displayName }) + ` ${t("auth.accountCreated")}`);
      onSuccess();
    } catch (error) {
      toast.error(t("auth.registrationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {userType !== "ngo" ? (
          <>
            {/* Individual Form */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City, State"
                      {...field}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="9876543210"
                      {...field}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      {...field}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <>
            {/* NGO Form */}
            <FormField
              control={form.control}
              name="ngoName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NGO Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Organization Name"
                      {...field}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City, State"
                      {...field}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ngoType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of NGO</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select NGO type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NGO_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contact@ngo.com"
                      {...field}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      disabled={isLoading}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" className="w-full pt-2" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("auth.createAccount")}
            </>
          ) : (
            t("auth.createAccount")
          )}
        </Button>
      </form>
    </Form>
  );
}

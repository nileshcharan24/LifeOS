"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createQuest } from "@/services/productivity/questService";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  frequency: z.enum(["daily", "weekly", "monthly"]),
});

export function CreateQuestModal() {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      frequency: "daily",
    }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await createQuest(values as any);
    window.dispatchEvent(new CustomEvent("xp_updated"));
    reset();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Quest</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new quest</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Controller
              control={control}
              name="name"
              render={({ field }) => <Input placeholder="Quest name" {...field} />}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => <Input placeholder="Quest description" {...field} />}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Frequency</label>
            <Controller
              control={control}
              name="frequency"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.frequency && <p className="text-sm text-red-500">{errors.frequency.message}</p>}
          </div>

          <Button type="submit">Submit</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// components/FilterModal.js
"use client";

import * as SliderPrimitive from "@radix-ui/react-slider"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";

export default function FilterModal({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters,
}) {
  const [filters, setFilters] = useState({
   category: currentFilters.category || "",
   subCategory: currentFilters.subCategory || "",
   company: currentFilters.company || "",
    // When null, no price filter is applied
    priceRange: currentFilters.priceRange ?? null,
  });

  const handleApply = () => {
    onApplyFilters(filters);
    // console.log("Applied Filters:", filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
  category: "",
  subCategory: "",
  company: "",
   // Clear price filter completely
   priceRange: null,
    };
    setFilters(resetFilters);
    onApplyFilters(resetFilters);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black max-w-5xl w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-black">
              FILTERS
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Desktop Layout - 3 columns */}
          <div className="hidden md:grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium text-black mb-3 block">
                Select the Industry
              </Label>
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters({ ...filters, category: value })
                }
              >
                <SelectTrigger className="bg-gray-100 border-gray-300 text-black h-12 rounded-xl">
                  <SelectValue placeholder="Design" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-black">
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Writing">Writing</SelectItem>
                  <SelectItem value="Video And Animation">Video And Animation</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile Layout - Stacked */}
          <div className="md:hidden space-y-6">
            <div>
              <Label className="text-sm font-medium text-black mb-3 block">
                Select the Industry
              </Label>
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters({ ...filters, category: value })
                }
              >
                <SelectTrigger className="bg-gray-100 border-gray-300 text-black h-12 rounded-xl">
                  <SelectValue placeholder="Design" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-black">
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Development">Development</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Writing">Writing</SelectItem>
                  <SelectItem value="Video And Animation">Video And Animation</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

                
            {/* we only have fixed budget range in gig model so we cant use this */}
            {/* <div>
              <Label className="text-sm font-medium text-black mb-3 block">
                Project type
              </Label>
              <Select
                value={filters.subCategory}
                onValueChange={(value) =>
                  setFilters({ ...filters, subCategory: value })
                }
              >
                <SelectTrigger className="bg-gray-100 border-gray-300 text-black h-12 rounded-xl">
                  <SelectValue placeholder="Fixed Price" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-black">
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="hourly">Hourly Rate</SelectItem>
                </SelectContent>
              </Select>
            </div> */}
          </div>

          {/* Price Range */}
          <div>
            <Label className="text-sm font-medium text-black mb-6 block">
              Select Price Range
            </Label>
            <div className="px-4">

             <Slider
  value={filters.priceRange ?? [100, 10000]}
  onValueChange={(value) => {
    // Always keep [min, max] in correct order
    const sorted = [...value].sort((a, b) => a - b)
    setFilters({ ...filters, priceRange: sorted })
  }}
  max={10000}
  min={100}
  step={100}
  className="w-full flex items-center"
>
  {/* Track (gray background) */}
  <SliderPrimitive.Track className="relative h-2 w-full grow rounded-full ">
    {/* Range (green between thumbs) */}
    <SliderPrimitive.Range className="absolute h-full " />
  </SliderPrimitive.Track>

  {/* Thumbs */}
  <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-green-500 bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50" />
  <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-green-500 bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50" />
</Slider>



              <div className="flex justify-between mt-4 text-sm text-gray-600">
                <span className="font-medium">
                  ₹{(filters.priceRange ?? [100, 10000])[0]}
                </span>
                <span className="font-medium">
                  ₹{(filters.priceRange ?? [100, 10000])[1]}
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              onClick={handleApply}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-full h-12 text-base font-medium"
            >
              Apply
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex-1 border-green-500 text-green-500 hover:bg-green-50 rounded-full h-12 text-base font-medium bg-transparent"
            >
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const houseTypeOptions = [
  "1BHK",
  "2BHK",
  "3BHK",
  "Independent House",
  "Studio Apartment"
] as const;

export const stateOptions = [
  "Telangana",
  "Andhra Pradesh",
  "Karnataka",
  "Tamil Nadu",
  "Maharashtra",
  "Delhi",
  "Other"
] as const;

export type ApplianceDefinition = {
  name: string;
  category: string;
  description: string;
  recommendedMax: number;
};

export const applianceCatalog: ApplianceDefinition[] = [
  { name: "Fans", category: "Cooling & comfort", description: "Ceiling or pedestal fans across the home.", recommendedMax: 15 },
  { name: "Lights", category: "Cooling & comfort", description: "Main lighting points used daily.", recommendedMax: 30 },
  { name: "AC", category: "Cooling & comfort", description: "Split or window air conditioners.", recommendedMax: 8 },
  { name: "Cooler", category: "Cooling & comfort", description: "Air coolers used in warmer months.", recommendedMax: 6 },
  { name: "Refrigerator", category: "Core appliances", description: "Primary refrigeration at home.", recommendedMax: 4 },
  { name: "TV", category: "Core appliances", description: "Televisions and smart displays.", recommendedMax: 6 },
  { name: "Washing Machine", category: "Core appliances", description: "Front-load or top-load washing machines.", recommendedMax: 3 },
  { name: "Geyser", category: "Core appliances", description: "Water heating units in bathrooms or kitchen.", recommendedMax: 6 },
  { name: "Microwave", category: "Kitchen & work", description: "Microwave ovens for regular cooking or reheating.", recommendedMax: 3 },
  { name: "Laptop/Desktop", category: "Kitchen & work", description: "Computers regularly used at home.", recommendedMax: 10 },
  { name: "Water Purifier", category: "Kitchen & work", description: "RO or purifier systems running daily.", recommendedMax: 3 }
];

export const applianceCategories = Array.from(
  new Set(applianceCatalog.map((item) => item.category))
);

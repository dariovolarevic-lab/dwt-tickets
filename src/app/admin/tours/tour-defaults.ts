export type TourFormValues = {
  name: string;
  description: string;
  meetingPoint: string;
  departureTimes: string;
  priceAdult: string;
  priceChild: string;
  active: boolean;
};

export const emptyTour: TourFormValues = {
  name: "",
  description: "",
  meetingPoint: "",
  departureTimes: "",
  priceAdult: "",
  priceChild: "",
  active: true,
};

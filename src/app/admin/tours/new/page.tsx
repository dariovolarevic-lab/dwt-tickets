import { PageHeader } from "@/components/dashboard-shell";
import { TourForm } from "../tour-form";
import { emptyTour } from "../tour-defaults";

export default function NewTourPage() {
  return (
    <>
      <PageHeader title="Nova tura" />
      <TourForm id={null} initial={emptyTour} />
    </>
  );
}

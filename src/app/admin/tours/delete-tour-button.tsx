"use client";

import { btn } from "@/components/ui";
import { deleteTourAction } from "./actions";

export function DeleteTourButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteTourAction.bind(null, id)}
      onSubmit={(e) => {
        if (
          !confirm(
            `Ukloniti turu "${name}"?\n\nAko za nju već postoje izdani vaučeri, bit će deaktivirana umjesto obrisana.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button className={btn.danger}>Ukloni</button>
    </form>
  );
}

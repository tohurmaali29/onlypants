import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackForm } from "@/components/order/track-form";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.track.title };
}

async function Form({ searchParams }: Pick<PageProps<"/[lang]/track">, "searchParams">) {
  const { code } = await searchParams;
  return <TrackForm defaultCode={typeof code === "string" ? code : undefined} />;
}

export default async function TrackPage({ searchParams }: PageProps<"/[lang]/track">) {
  const { t } = await getDictionary();
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl uppercase">{t.track.title}</h1>
        <p className="mt-2 mb-8 text-muted">{t.track.body}</p>
        <Suspense fallback={<TrackForm />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

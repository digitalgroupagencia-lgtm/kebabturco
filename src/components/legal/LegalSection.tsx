import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  id?: string;
};

export default function LegalSection({ title, children, id }: Props) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">{title}</h2>
      <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

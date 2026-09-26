"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Fase 0: sem envio real. Na Fase 1, grava em `contact_messages` no Supabase. */
export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-3xl border bg-card p-10 text-center">
        <CheckCircle2 className="mb-3 size-10 text-success" aria-hidden />
        <h2 className="text-xl font-extrabold">Mensagem recebida (simulação)</h2>
        <p className="mt-1 text-sm text-muted-foreground">Nesta versão de exemplo nada foi enviado.</p>
        <Button variant="outline" className="mt-5" onClick={() => setSent(false)}>
          Enviar outra
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-5 rounded-3xl border bg-card p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setSending(true);
        window.setTimeout(() => {
          setSending(false);
          setSent(true);
        }, 600);
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="assunto">Assunto</Label>
        <select
          id="assunto"
          name="assunto"
          className="h-11 w-full rounded-xl border border-input bg-card px-3 text-base shadow-xs md:text-sm"
          defaultValue="preco"
        >
          <option value="preco">Preço errado ou desatualizado</option>
          <option value="loja">Sugerir loja ou produto</option>
          <option value="parceria">Parcerias</option>
          <option value="outro">Outro assunto</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mensagem">Mensagem</Label>
        <Textarea id="mensagem" name="mensagem" rows={5} required placeholder="Conte o que aconteceu. Se for um preço, cole o link do produto." />
      </div>
      <p className="text-xs text-muted-foreground">
        Usamos seus dados apenas para responder a esta mensagem (LGPD). Veja a Política de Privacidade.
      </p>
      <Button type="submit" disabled={sending} size="lg">
        <Send /> {sending ? "Enviando..." : "Enviar mensagem"}
      </Button>
    </form>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// Preencha com a URL do seu Google Apps Script (Sheets webhook)
const SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyP-QbHP8R7abyDzqHiG3g-k8YmJhRrWk9rDeCpxEsPwROi82c5P1OfIzPO0paQa6Xo4Q/exec";

const STEPS = [
  {
    key: "segment",
    label: "segmento da empresa",
    title: "Qual o segmento da sua empresa?",
    options: ["Mercado / Mercadinho", "Farmácia", "Atacado / Distribuidor", "Loja de Cosméticos", "Outro"],
  },
  {
    key: "volume",
    label: "volume mensal de compras",
    title: "Qual seu volume mensal de compras?",
    options: ["Até R$ 800", "R$ 800 a R$ 3.000", "R$ 3.000 a R$ 10.000", "Acima de R$ 10.000"],
  },
  {
    key: "state",
    label: "estado",
    title: "Em qual estado sua empresa atua?",
    options: ["Maranhão (MA)", "Piauí (PI)"],
  },
] as const;

// Aplica máscara XX.XXX.XXX/XXXX-XX enquanto digita
const formatCNPJ = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2")
    .replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, "$1-$2");
};

// Algoritmo mod11 — validação real de CNPJ
const isValidCNPJ = (cnpj: string) => {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (str: string, len: number) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += +str[len - i] * pos--;
      if (pos < 2) pos = 9;
    }
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  return calc(d, 12) === +d[12] && calc(d, 13) === +d[13];
};

// Aplica máscara (XX) XXXXX-XXXX enquanto digita
const formatWhatsApp = (value: string) => {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

export const LeadForm = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ name: "", whatsapp: "", cnpj: "", email: "" });
  const [cnpjError, setCnpjError] = useState(false);

  const isFinal = step === STEPS.length;
  const progress = ((step + (isFinal ? 1 : 0)) / (STEPS.length + 1)) * 100;

  const select = (value: string) => {
    setAnswers((p) => ({ ...p, [STEPS[step].key]: value }));
    setTimeout(() => setStep((s) => s + 1), 180);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setContact({ ...contact, cnpj: formatted });
    // Só valida após digitar os 14 dígitos
    if (formatted.replace(/\D/g, "").length === 14) {
      setCnpjError(!isValidCNPJ(formatted));
    } else {
      setCnpjError(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contact.name || !contact.whatsapp || !contact.cnpj || !contact.email) {
      toast.error("Preencha todos os campos para continuar");
      return;
    }

    if (!isValidCNPJ(contact.cnpj)) {
      setCnpjError(true);
      toast.error("CNPJ inválido. Verifique e tente novamente.");
      return;
    }

    // Dispara conversão Google Ads
    if (typeof (window as any).gtag_report_conversion === "function") {
      (window as any).gtag_report_conversion();
    }

    // Monta string de resposta do quiz no formato esperado pela planilha
    const respostaQuiz =
      `Email: ${contact.email} | Cidade: - | ` +
      `volume mensal de compras: ${answers.volume} | ` +
      `segmento da empresa: ${answers.segment} | ` +
      `Categorias: - | Media Faturamento: -`;

    // Envia para Google Sheets via webhook (Apps Script)
    if (SHEETS_WEBHOOK_URL) {
      fetch(SHEETS_WEBHOOK_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: contact.name,
          email: contact.email,
          cnpj: contact.cnpj,
          whatsapp: contact.whatsapp,
          estado: answers.state,
          resposta_quiz: respostaQuiz,
        }),
      }).catch(() => {});
    }

    toast.success("Recebemos seu cadastro! Em breve entraremos em contato via WhatsApp.");

    const msg = encodeURIComponent(
      `Olá! Sou ${contact.name}, CNPJ ${contact.cnpj}, Email: ${contact.email}. ` +
      `Quero virar cliente Rio Piranhas. ` +
      `segmento da empresa: ${answers.segment} | ` +
      `volume mensal de compras: ${answers.volume} | ` +
      `estado: ${answers.state}.`,
    );

    const phoneNumbers: Record<string, string> = {
      "Maranhão (MA)": "558695319157",
      "Piauí (PI)": "558694271798",
    };

    const phoneNumber = phoneNumbers[answers.state] || "5598000000000";
    window.open(`https://wa.me/${phoneNumber}?text=${msg}`, "_blank");
  };

  return (
    <div className="rounded-2xl bg-card p-5 shadow-blue ring-1 ring-border sm:p-7">
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>Etapa {Math.min(step + 1, STEPS.length + 1)} de {STEPS.length + 1}</span>
          <span className="text-primary">{Math.round(progress)}% concluído</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-gradient-blue transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {!isFinal ? (
        <div key={step} className="animate-float-up">
          <h3 className="mb-4 font-display text-xl font-bold text-foreground sm:text-2xl">
            {STEPS[step].title}
          </h3>
          <div className="space-y-2">
            {STEPS[step].options.map((opt) => {
              const active = answers[STEPS[step].key] === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  className={`group flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-background hover:border-primary hover:bg-primary-soft"
                  }`}
                >
                  <span>{opt}</span>
                  <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-3 w-3" /> Voltar
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="animate-float-up space-y-3">
          <h3 className="font-display text-xl font-bold sm:text-2xl">Falta pouco! Onde te chamamos?</h3>
          <p className="text-sm text-muted-foreground">Resposta em até 5 minutos no horário comercial.</p>
          <div className="space-y-3 pt-2">
            <div>
              <Label htmlFor="name" className="text-xs font-semibold">Seu nome</Label>
              <Input
                id="name"
                placeholder="Nome completo"
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs font-semibold">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="cnpj" className="text-xs font-semibold">CNPJ da empresa</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={contact.cnpj}
                onChange={handleCnpjChange}
                className={cnpjError ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {cnpjError && (
                <p className="mt-1 text-xs text-red-500">CNPJ inválido. Verifique os números.</p>
              )}
            </div>
            <div>
              <Label htmlFor="wa" className="text-xs font-semibold">WhatsApp</Label>
              <Input
                id="wa"
                placeholder="(98) 90000-0000"
                value={contact.whatsapp}
                onChange={(e) => setContact({ ...contact, whatsapp: formatWhatsApp(e.target.value) })}
              />
            </div>
          </div>
          <Button type="submit" variant="cta" size="xl" className="w-full animate-pulse-soft">
            <Check className="h-5 w-5" /> Quero falar com um consultor
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Seus dados são confidenciais. Sem spam.
          </p>
        </form>
      )}
    </div>
  );
};

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import AccentLink from "@/ui/AccentLink";
import Button from "@/ui/Button";
import Input from "@/ui/Input";
import Label from "@/ui/Label";

export default function PaymentAndConfirmation() {
  const tSuccess = useTranslations("payment.success");
  const tCheckout = useTranslations("payment.checkout");
  const [paymentStep, setPaymentStep] = useState("checkout");
  const [selectedMethod, setSelectedMethod] = useState<"card" | "paypal" | null>(null);

  if (paymentStep === "success") {
    return (
      <div className="max-w-2xl mx-auto py-24 px-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-500">
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-6">{tSuccess("title")}</h1>
        <div className="space-y-6 text-zinc-400 text-base leading-relaxed">
          <p>{tSuccess("thankYou")}</p>
          <p>{tSuccess("reviewNotice")}</p>
          <div className="pt-8 border-t border-zinc-900 mt-10">
            <p className="text-sm">
              {tSuccess("questions")} <br />
              <AccentLink
                href="mailto:info@leadingsiresregistry.com"
                variant="inline"
                external
                className="font-bold"
              >
                info@leadingsiresregistry.com
              </AccentLink>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-20 px-6">
      <div className="text-center mb-10">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#b08d57] mb-2">
          {tCheckout("secureCheckout")}
        </h2>
        <h1 className="text-2xl font-bold text-white">{tCheckout("listingFee")}</h1>
      </div>

      <div className="rounded-none border border-zinc-800 bg-zinc-900/30 p-8 space-y-8">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <span className="text-zinc-400 text-sm">{tCheckout("listingType")}</span>
          <span className="text-white font-medium text-xs">
            {tCheckout("listingTypeValue")}
          </span>
        </div>

        <div className="flex justify-between items-center text-xl font-bold">
          <span className="text-white">{tCheckout("total")}</span>
          <span className="text-[#b08d57]">$250.00</span>
        </div>

        <div className="space-y-4 pt-4">
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
            {tCheckout("selectPaymentMethod")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="unstyled"
              size="none"
              onClick={() => setSelectedMethod("card")}
              className={`w-full border p-3 text-center text-[10px] font-bold uppercase transition ${
                selectedMethod === "card" ? "border-[#b08d57] text-[#b08d57] bg-[#b08d57]/5" : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {tCheckout("creditCard")}
            </Button>
            <Button
              type="button"
              variant="unstyled"
              size="none"
              onClick={() => setSelectedMethod("paypal")}
              className={`w-full border p-3 text-center text-[10px] font-bold uppercase transition ${
                selectedMethod === "paypal" ? "border-[#b08d57] text-[#b08d57] bg-[#b08d57]/5" : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {tCheckout("paypal")}
            </Button>
          </div>
        </div>

        {selectedMethod === "card" && (
          <div className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                {tCheckout("cardNumber")}
              </Label>
              <Input
                type="text"
                variant="public"
                placeholder={tCheckout("cardNumberPlaceholder")}
                className="rounded-none border-zinc-800 bg-zinc-950 p-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                  {tCheckout("expiry")}
                </Label>
                <Input
                  type="text"
                  variant="public"
                  placeholder={tCheckout("expiryPlaceholder")}
                  className="rounded-none border-zinc-800 bg-zinc-950 p-3"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                  {tCheckout("cvv")}
                </Label>
                <Input
                  type="text"
                  variant="public"
                  placeholder={tCheckout("cvvPlaceholder")}
                  className="rounded-none border-zinc-800 bg-zinc-950 p-3"
                />
              </div>
            </div>
          </div>
        )}

        {selectedMethod === "paypal" && (
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 text-center animate-in fade-in duration-300">
            <p className="text-xs text-zinc-400">{tCheckout("paypalRedirect")}</p>
          </div>
        )}

        <Button
          type="button"
          variant="goldSubmit"
          size="lg"
          disabled={!selectedMethod}
          onClick={() => selectedMethod && setPaymentStep("success")}
          className="w-full py-4 text-xs"
        >
          {tCheckout("payAndSubmit")}
        </Button>
      </div>
    </div>
  );
}

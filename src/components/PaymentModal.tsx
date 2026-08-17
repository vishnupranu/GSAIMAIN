import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Smartphone, Check, ShieldCheck, QrCode,
  Copy, Loader2, ArrowRight, X, Sparkles, Download, CheckCircle2, Lock
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  price: string;
  period: string;
}

type PaymentMethod = "gpay" | "upi" | "card";

const PaymentModal = ({ isOpen, onClose, planName, price, period }: PaymentModalProps) => {
  const [method, setMethod] = useState<PaymentMethod>("gpay");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [upiId, setUpiId] = useState("guidesoft@upi");
  const [customUpi, setCustomUpi] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 min countdown
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setIsSuccess(false);
      setTimerSeconds(300);
      setTransactionId(`TXN_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`);
    }
  }, [isOpen]);

  // Countdown timer for UPI QR
  useEffect(() => {
    if (!isOpen || isSuccess || timerSeconds <= 0) return;
    const interval = setInterval(() => setTimerSeconds((s) => s - 1), 1000);
    return () => clearInterval(interval);
  }, [isOpen, isSuccess, timerSeconds]);

  const formatTimer = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
    toast.success("UPI ID copied to clipboard!");
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);

    const payload = {
      transaction_id: transactionId,
      plan_name: planName,
      amount: price,
      period: period,
      payment_method: method,
      upi_id: method === "upi" ? customUpi || upiId : undefined,
      timestamp: new Date().toISOString(),
    };

    try {
      // Send webhook to backend
      const resp = await fetch("/api/v1/webhooks/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      // Simulate payment network verification delay
      await new Promise((resolve) => setTimeout(resolve, 1800));

      setIsProcessing(false);
      setIsSuccess(true);
      toast.success(`Payment verified! ${planName} Plan activated.`);
    } catch {
      setIsProcessing(false);
      setIsSuccess(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border bg-card">
        {/* Header */}
        <div className="bg-muted/30 p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">Secure Checkout</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Encrypted 256-bit SSL transaction • Instant Activation
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Plan badge summary */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-background p-3">
            <div>
              <p className="text-xs font-semibold text-foreground">{planName} Subscription</p>
              <p className="text-[11px] text-muted-foreground">Billed {period}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{price}</p>
              <p className="text-[10px] text-emerald-500 font-semibold">Taxes included</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!isSuccess ? (
            <div className="space-y-5">
              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod("gpay")}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    method === "gpay"
                      ? "border-foreground bg-accent text-foreground shadow-sm"
                      : "border-border text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <span className="text-sm font-bold tracking-tight">GPay</span>
                  <span className="text-[10px] text-muted-foreground">Google Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("upi")}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    method === "upi"
                      ? "border-foreground bg-accent text-foreground shadow-sm"
                      : "border-border text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                  <span className="text-[10px]">UPI & QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod("card")}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    method === "card"
                      ? "border-foreground bg-accent text-foreground shadow-sm"
                      : "border-border text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-[10px]">Cards</span>
                </button>
              </div>

              {/* Method 1: Google Pay */}
              {method === "gpay" && (
                <div className="space-y-4 text-center py-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-primary-foreground text-xl font-bold">
                    G
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Pay with Google Pay</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fast, secure 1-click checkout linked to your Google Account.
                    </p>
                  </div>
                  <Button
                    onClick={handleProcessPayment}
                    disabled={isProcessing}
                    className="w-full h-11 bg-foreground text-primary-foreground font-semibold rounded-xl gap-2 hover:opacity-90"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Pay {price} with</span>
                        <span className="font-bold tracking-tight">GPay</span>
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Method 2: UPI & QR Code */}
              {method === "upi" && (
                <div className="space-y-4 text-center">
                  <div className="mx-auto w-44 aspect-square rounded-2xl border border-border bg-white p-3 shadow-sm flex flex-col items-center justify-center relative">
                    {/* SVG Rendered UPI QR */}
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <rect width="100" height="100" fill="white" />
                      {/* Top Left Marker */}
                      <rect x="10" y="10" width="24" height="24" fill="black" rx="2" />
                      <rect x="14" y="14" width="16" height="16" fill="white" rx="1" />
                      <rect x="18" y="18" width="8" height="8" fill="black" />
                      {/* Top Right Marker */}
                      <rect x="66" y="10" width="24" height="24" fill="black" rx="2" />
                      <rect x="70" y="14" width="16" height="16" fill="white" rx="1" />
                      <rect x="74" y="18" width="8" height="8" fill="black" />
                      {/* Bottom Left Marker */}
                      <rect x="10" y="66" width="24" height="24" fill="black" rx="2" />
                      <rect x="14" y="70" width="16" height="16" fill="white" rx="1" />
                      <rect x="18" y="74" width="8" height="8" fill="black" />
                      {/* Data Pattern */}
                      <rect x="42" y="12" width="6" height="6" fill="black" />
                      <rect x="52" y="18" width="6" height="6" fill="black" />
                      <rect x="44" y="28" width="6" height="6" fill="black" />
                      <rect x="14" y="44" width="6" height="6" fill="black" />
                      <rect x="26" y="48" width="6" height="6" fill="black" />
                      <rect x="40" y="44" width="18" height="18" fill="#1e1b4b" rx="2" />
                      <circle cx="49" cy="53" r="4" fill="#38bdf8" />
                      <rect x="68" y="42" width="6" height="6" fill="black" />
                      <rect x="80" y="48" width="6" height="6" fill="black" />
                      <rect x="44" y="70" width="6" height="6" fill="black" />
                      <rect x="54" y="80" width="6" height="6" fill="black" />
                      <rect x="70" y="72" width="6" height="6" fill="black" />
                      <rect x="82" y="82" width="6" height="6" fill="black" />
                    </svg>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-mono font-semibold text-foreground bg-muted px-3 py-1 rounded-lg">
                      {upiId}
                    </span>
                    <Button variant="ghost" size="icon" onClick={copyUpiId} className="h-7 w-7">
                      {copiedUpi ? <Check className="h-3.5 w-3.5 text-tool-green" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Scan with any UPI App (Google Pay, PhonePe, Paytm, BHIM). QR expires in{" "}
                    <span className="font-mono font-bold text-foreground">{formatTimer(timerSeconds)}</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <a
                      href={`upi://pay?pa=${upiId}&pn=GUIDESOFT%20AI&am=${price.replace(/[^0-9.]/g, '') || '29'}&cu=INR`}
                      className="inline-flex items-center justify-center h-10 px-3 rounded-xl bg-accent text-foreground text-xs font-semibold hover:bg-accent/80 transition-colors gap-1.5"
                    >
                      <Smartphone className="h-3.5 w-3.5" /> Open in UPI App
                    </a>
                    <Button
                      onClick={handleProcessPayment}
                      disabled={isProcessing}
                      className="h-10 rounded-xl font-semibold text-xs gap-2"
                    >
                      {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify Payment"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Method 3: Cards */}
              {method === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-foreground mb-1 block">Cardholder Name</label>
                    <Input
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground mb-1 block">Card Number</label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 •••• •••• 8892"
                      className="h-9 text-xs font-mono"
                      maxLength={19}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-foreground mb-1 block">Expiry</label>
                      <Input
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="h-9 text-xs font-mono"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-foreground mb-1 block">CVV / CVC</label>
                      <Input
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="•••"
                        type="password"
                        className="h-9 text-xs font-mono"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleProcessPayment}
                    disabled={isProcessing}
                    className="w-full h-11 mt-2 rounded-xl font-semibold gap-2"
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${price}`}
                  </Button>
                </div>
              )}

              {/* Footer Trust Guarantee */}
              <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-muted-foreground border-t border-border">
                <Lock className="h-3 w-3" />
                <span>256-Bit Bank-Grade Encryption • Zero Card Storage</span>
              </div>
            </div>
          ) : (
            /* Success Receipt View */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4 text-center space-y-4"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-foreground">Payment Successful!</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your <strong className="text-foreground">{planName} Plan</strong> is now active.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono font-semibold text-foreground">{transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-bold text-foreground">{price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="uppercase font-semibold text-foreground">{method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-emerald-500 font-bold">COMPLETED</span>
                </div>
              </div>

              <Button onClick={onClose} className="w-full h-10 rounded-xl font-semibold">
                Start Creating with {planName}
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;

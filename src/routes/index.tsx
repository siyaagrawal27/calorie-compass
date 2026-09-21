import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACTIVITY_LEVELS,
  RANGES,
  calculateBMR,
  calculateTDEE,
  cmToFeetInches,
  feetInchesToCm,
  formatKcal,
  kgToLb,
  lbToKg,
  type Sex,
} from "@/lib/calorie";
import heroBowl from "@/assets/hero-bowl.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartCal — Daily Calorie & Energy Needs Calculator" },
      {
        name: "description",
        content:
          "Estimate your BMR and daily calorie needs in under two minutes. Transparent Mifflin–St Jeor formula, metric or imperial units, client-side and private.",
      },
      { property: "og:title", content: "SmartCal — Daily Calorie & Energy Needs Calculator" },
      {
        property: "og:description",
        content: "Estimate your BMR and daily calorie needs with transparent formulas. Educational estimates only — not medical advice.",
      },
    ],
  }),
  component: SmartCal,
});

type HeightUnit = "cm" | "ftin";
type WeightUnit = "kg" | "lb";

interface Result {
  bmr: number;
  tdee: number;
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  activityLabel: string;
  multiplier: number;
}

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function SmartCal() {
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [weight, setWeight] = useState("");
  const [activityId, setActivityId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<"age" | "sex" | "height" | "weight" | "activity", string>>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const activity = ACTIVITY_LEVELS.find((a) => a.id === activityId) ?? null;
  const under18 = useMemo(() => {
    const a = Number(age);
    return age !== "" && !Number.isNaN(a) && a < 18;
  }, [age]);

  function switchHeightUnit(next: HeightUnit) {
    if (next === heightUnit) return;
    if (next === "ftin" && heightCm !== "" && !Number.isNaN(Number(heightCm))) {
      const { feet, inches } = cmToFeetInches(Number(heightCm));
      setHeightFt(String(feet));
      setHeightIn(String(inches));
    }
    if (next === "cm" && (heightFt !== "" || heightIn !== "")) {
      const ft = Number(heightFt) || 0;
      const inch = Number(heightIn) || 0;
      setHeightCm(String(Math.round(feetInchesToCm(ft, inch))));
    }
    setHeightUnit(next);
  }

  function switchWeightUnit(next: WeightUnit) {
    if (next === weightUnit || weight === "" || Number.isNaN(Number(weight))) {
      setWeightUnit(next);
      return;
    }
    const v = Number(weight);
    setWeight(
      next === "lb" ? String(Math.round(kgToLb(v) * 10) / 10) : String(Math.round(lbToKg(v) * 10) / 10)
    );
    setWeightUnit(next);
  }

  function validate(): boolean {
    const e: Partial<Record<"age" | "sex" | "height" | "weight" | "activity", string>> = {};
    const ageN = Number(age);
    if (age === "" || Number.isNaN(ageN)) e.age = "Please enter your age.";
    else if (!Number.isInteger(ageN) || ageN < RANGES.age.min || ageN > RANGES.age.max)
      e.age = `Age must be a whole number between ${RANGES.age.min} and ${RANGES.age.max}.`;

    if (!sex) e.sex = "Please select a sex — the formula needs it.";

    let cm = NaN;
    if (heightUnit === "cm") {
      cm = Number(heightCm);
      if (heightCm === "" || Number.isNaN(cm)) e.height = "Please enter your height.";
    } else {
      const ft = Number(heightFt);
      const inch = Number(heightIn);
      if ((heightFt === "" && heightIn === "") || Number.isNaN(ft) || Number.isNaN(inch))
        e.height = "Please enter your height.";
      else if (inch < 0 || inch >= 12) e.height = "Inches must be between 0 and 11.";
      else cm = feetInchesToCm(ft, inch);
    }
    if (!e.height && (cm < RANGES.heightCm.min || cm > RANGES.heightCm.max))
      e.height = `Height must be between ${RANGES.heightCm.min} and ${RANGES.heightCm.max} cm.`;

    const w = Number(weight);
    if (weight === "" || Number.isNaN(w)) e.weight = "Please enter your weight.";
    else {
      const kg = weightUnit === "kg" ? w : lbToKg(w);
      if (kg < RANGES.weightKg.min || kg > RANGES.weightKg.max)
        e.weight =
          weightUnit === "kg"
            ? `Weight must be between ${RANGES.weightKg.min} and ${RANGES.weightKg.max} kg.`
            : `Weight must be between ${Math.round(kgToLb(RANGES.weightKg.min))} and ${Math.round(kgToLb(RANGES.weightKg.max))} lb.`;
    }

    if (!activity) e.activity = "Please pick the activity level closest to your routine.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleCalculate(ev: React.FormEvent) {
    ev.preventDefault();
    setSubmitted(true);
    if (!validate() || !sex || !activity) return;
    const heightCmVal =
      heightUnit === "cm"
        ? Number(heightCm)
        : feetInchesToCm(Number(heightFt) || 0, Number(heightIn) || 0);
    const weightKgVal = weightUnit === "kg" ? Number(weight) : lbToKg(Number(weight));
    const ageN = Number(age);
    const bmr = calculateBMR(sex, weightKgVal, heightCmVal, ageN);
    setResult({
      bmr,
      tdee: calculateTDEE(bmr, activity.multiplier),
      age: ageN,
      sex,
      weightKg: weightKgVal,
      heightCm: heightCmVal,
      activityLabel: activity.label,
      multiplier: activity.multiplier,
    });
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pb-4 pt-8">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-2xl clay">
            🥕
          </div>
          <div>
            <p className="font-display text-xl font-extrabold leading-none">SmartCal</p>
            <p className="text-xs font-semibold text-ink/50">calories, made friendly</p>
          </div>
        </div>
        <span className="hidden rounded-full bg-white/70 px-4 py-2 text-xs font-bold text-ink/60 clay-sm sm:inline-block">
          Estimates only · not medical advice
        </span>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Intro column */}
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-peach-soft px-4 py-1.5">
              <span className="text-base">🔥</span>
              <span className="text-sm font-extrabold text-ink/70">Daily calorie intake</span>
            </div>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.02] sm:text-6xl">
              Know what your body needs.
            </h1>
            <p className="mt-4 max-w-md text-lg font-medium text-ink/65">
              Answer a few quick questions and SmartCal turns them into your resting (BMR) and daily
              (TDEE) energy estimate — with the math shown in plain sight.
            </p>
            <div className="mt-8">
              <img
                src={heroBowl}
                alt="A pastel clay-style bowl of healthy food with avocado toast and berries"
                width={1024}
                height={896}
                className="aspect-[10/9] w-full rounded-[2rem] object-cover clay-deep"
              />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-3xl bg-white/60 p-5 clay-sm">
                <p className="text-2xl">🔒</p>
                <p className="mt-2 font-display text-lg font-extrabold">Private by design</p>
                <p className="text-sm font-medium text-ink/55">Everything runs in your browser</p>
              </div>
              <div className="rounded-3xl bg-white/60 p-5 clay-sm">
                <p className="text-2xl">🧮</p>
                <p className="mt-2 font-display text-lg font-extrabold">Transparent math</p>
                <p className="text-sm font-medium text-ink/55">Mifflin–St Jeor, shown step by step</p>
              </div>
            </div>
          </div>

          {/* Form column */}
          <div className="lg:col-span-7">
            <form
              onSubmit={handleCalculate}
              noValidate
              className="rounded-[2rem] bg-white/80 p-7 clay-deep sm:p-9"
            >
              <p className="font-display text-2xl font-extrabold">Build your number</p>
              <p className="text-sm font-semibold text-ink/55">Three steps — no sign-up needed.</p>

              {/* Step 1: About you */}
              <fieldset className="mt-7">
                <legend className="text-sm font-extrabold uppercase tracking-wide text-ink/50">
                  1 · About you
                </legend>
                <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="age" className="text-sm font-extrabold text-ink/70">
                      Age
                    </label>
                    <input
                      id="age"
                      type="number"
                      inputMode="numeric"
                      min={RANGES.age.min}
                      max={RANGES.age.max}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 31"
                      aria-invalid={!!errors.age}
                      aria-describedby={errors.age ? "age-error" : undefined}
                      className="mt-2 h-12 w-full rounded-2xl bg-cream px-4 font-display text-lg font-bold outline-none clay-sm focus:ring-2 focus:ring-brand"
                    />
                    {errors.age && (
                      <p id="age-error" role="alert" className="mt-1.5 text-xs font-bold text-destructive">
                        {errors.age}
                      </p>
                    )}
                  </div>
                  <div>
                    <span id="sex-label" className="text-sm font-extrabold text-ink/70">
                      Sex
                    </span>
                    <div
                      role="radiogroup"
                      aria-labelledby="sex-label"
                      className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-cream p-1.5 clay-sm"
                    >
                      {(["female", "male"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          role="radio"
                          aria-checked={sex === s}
                          onClick={() => setSex(s)}
                          className={`rounded-xl py-2.5 text-sm font-extrabold capitalize transition ${
                            sex === s ? "bg-brand text-white clay-sm" : "text-ink/50 hover:text-ink"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {errors.sex && (
                      <p role="alert" className="mt-1.5 text-xs font-bold text-destructive">
                        {errors.sex}
                      </p>
                    )}
                  </div>
                </div>
                {under18 && (
                  <div className="mt-4 flex gap-3 rounded-2xl bg-lilac-soft p-4">
                    <span className="text-xl">🌱</span>
                    <p className="text-sm font-semibold text-ink/70">
                      You're under 18 — nutritional needs during growth are individual. SmartCal won't
                      set calorie-restriction or weight targets for you; please talk with a parent or
                      guardian and a qualified healthcare professional.
                    </p>
                  </div>
                )}
              </fieldset>

              {/* Step 2: Measurements */}
              <fieldset className="mt-7">
                <legend className="text-sm font-extrabold uppercase tracking-wide text-ink/50">
                  2 · Measurements
                </legend>
                <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="height-cm" className="text-sm font-extrabold text-ink/70">
                        Height
                      </label>
                      <UnitToggle
                        options={[
                          { id: "cm", label: "cm" },
                          { id: "ftin", label: "ft/in" },
                        ]}
                        value={heightUnit}
                        onChange={(v) => switchHeightUnit(v as HeightUnit)}
                      />
                    </div>
                    {heightUnit === "cm" ? (
                      <input
                        id="height-cm"
                        type="number"
                        inputMode="decimal"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        placeholder="e.g. 172"
                        aria-invalid={!!errors.height}
                        className="mt-2 h-12 w-full rounded-2xl bg-cream px-4 font-display text-lg font-bold outline-none clay-sm focus:ring-2 focus:ring-brand"
                      />
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <input
                          id="height-ft"
                          type="number"
                          inputMode="numeric"
                          aria-label="Height in feet"
                          value={heightFt}
                          onChange={(e) => setHeightFt(e.target.value)}
                          placeholder="ft"
                          className="h-12 w-full rounded-2xl bg-cream px-4 font-display text-lg font-bold outline-none clay-sm focus:ring-2 focus:ring-brand"
                        />
                        <input
                          id="height-in"
                          type="number"
                          inputMode="decimal"
                          aria-label="Height in inches"
                          value={heightIn}
                          onChange={(e) => setHeightIn(e.target.value)}
                          placeholder="in"
                          className="h-12 w-full rounded-2xl bg-cream px-4 font-display text-lg font-bold outline-none clay-sm focus:ring-2 focus:ring-brand"
                        />
                      </div>
                    )}
                    {errors.height && (
                      <p role="alert" className="mt-1.5 text-xs font-bold text-destructive">
                        {errors.height}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="weight" className="text-sm font-extrabold text-ink/70">
                        Weight
                      </label>
                      <UnitToggle
                        options={[
                          { id: "kg", label: "kg" },
                          { id: "lb", label: "lb" },
                        ]}
                        value={weightUnit}
                        onChange={(v) => switchWeightUnit(v as WeightUnit)}
                      />
                    </div>
                    <input
                      id="weight"
                      type="number"
                      inputMode="decimal"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder={weightUnit === "kg" ? "e.g. 68" : "e.g. 150"}
                      aria-invalid={!!errors.weight}
                      className="mt-2 h-12 w-full rounded-2xl bg-cream px-4 font-display text-lg font-bold outline-none clay-sm focus:ring-2 focus:ring-brand"
                    />
                    {errors.weight && (
                      <p role="alert" className="mt-1.5 text-xs font-bold text-destructive">
                        {errors.weight}
                      </p>
                    )}
                  </div>
                </div>
              </fieldset>

              {/* Step 3: Activity */}
              <fieldset className="mt-7">
                <legend className="text-sm font-extrabold uppercase tracking-wide text-ink/50">
                  3 · Activity level
                </legend>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Activity level">
                  {ACTIVITY_LEVELS.map((level) => {
                    const selected = activityId === level.id;
                    return (
                      <button
                        key={level.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setActivityId(level.id)}
                        className={`rounded-2xl px-4 py-3 text-left transition ${
                          selected ? "bg-mint text-ink clay-sm" : "bg-cream text-ink/60 hover:text-ink"
                        }`}
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-sm font-extrabold">{level.label}</span>
                          <span className={`font-display text-xs font-bold ${selected ? "text-ink/70" : "text-ink/40"}`}>
                            ×{level.multiplier}
                          </span>
                        </span>
                        <span className={`mt-0.5 block text-xs font-semibold ${selected ? "text-ink/70" : "text-ink/45"}`}>
                          {level.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.activity && (
                  <p role="alert" className="mt-1.5 text-xs font-bold text-destructive">
                    {errors.activity}
                  </p>
                )}
              </fieldset>

              <button
                type="submit"
                className="mt-8 h-14 w-full rounded-2xl bg-peach font-display text-lg font-extrabold text-white transition-transform clay hover:scale-[1.01] active:scale-[0.99]"
              >
                Calculate my calories
              </button>
              {submitted && Object.keys(errors).length > 0 && (
                <p role="alert" className="mt-3 text-center text-sm font-bold text-destructive">
                  Please fix the fields above and try again.
                </p>
              )}
            </form>
          </div>
        </section>

        {/* Results */}
        {result && (
          <section ref={resultsRef} className="mt-10 animate-rise" aria-live="polite">
            <Results result={result} onEdit={() => setResult(null)} />
          </section>
        )}

        <footer className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-ink/10 pt-6 sm:flex-row">
          <p className="text-sm font-bold text-ink/45">
            SmartCal · an educational calculator, not medical advice
          </p>
          <p className="text-sm font-bold text-ink/45">Runs fully in your browser — nothing is stored</p>
        </footer>
      </main>
    </div>
  );
}

function UnitToggle({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-cream p-1 clay-sm">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide transition ${
            value === o.id ? "bg-brand text-white" : "text-ink/50 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Results({ result, onEdit }: { result: Result; onEdit: () => void }) {
  const bmrDisplay = useCountUp(Math.round(result.bmr));
  const tdeeDisplay = useCountUp(Math.round(result.tdee));
  const tdeeRatio = Math.min(1, result.tdee / 3500);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-3xl font-extrabold">Your daily estimate</h2>
        <span className="text-sm font-bold text-ink/50">
          {result.age} · {result.sex === "male" ? "Male" : "Female"} · {Math.round(result.heightCm)} cm ·{" "}
          {Math.round(result.weightKg * 10) / 10} kg · {result.activityLabel}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* TDEE hero */}
        <div className="rounded-[1.75rem] bg-brand p-7 text-white clay-deep">
          <p className="text-xs font-extrabold uppercase tracking-widest text-white/80">TDEE — daily total</p>
          <p className="mt-1 font-display text-5xl font-extrabold tabular-nums">{formatKcal(tdeeDisplay)}</p>
          <p className="mt-1 font-bold text-white/80">kcal / day to maintain</p>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${tdeeRatio * 100}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-white/70">
            BMR × {result.multiplier} ({result.activityLabel})
          </p>
        </div>

        {/* BMR */}
        <div className="rounded-[1.75rem] bg-white/85 p-7 clay-deep">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink/50">BMR — resting</p>
          <p className="mt-1 font-display text-5xl font-extrabold tabular-nums text-ink">{formatKcal(bmrDisplay)}</p>
          <p className="mt-1 font-bold text-ink/55">kcal / day at complete rest</p>
          <p className="mt-4 border-t border-ink/10 pt-3 text-sm font-semibold leading-relaxed text-ink/60">
            The energy your body uses for basic functions before any activity.
          </p>
        </div>

        {/* Formula */}
        <div className="rounded-[1.75rem] bg-white/85 p-7 clay-deep">
          <p className="text-sm font-extrabold text-ink/50">How we got here</p>
          <div className="mt-4 space-y-3 text-sm font-semibold text-ink/70">
            <p>
              Mifflin–St Jeor:
              <span className="mt-1.5 block rounded-xl bg-brand-soft px-3 py-2 font-display text-[13px] font-bold text-ink">
                (10 × {Math.round(result.weightKg * 10) / 10}) + (6.25 × {Math.round(result.heightCm)}) − (5 ×{" "}
                {result.age}) {result.sex === "male" ? "+ 5" : "− 161"} = {formatKcal(result.bmr)}
              </span>
            </p>
            <p>
              Then multiply by your activity factor:
              <span className="mt-1.5 block rounded-xl bg-mint-soft px-3 py-2 font-display text-[13px] font-bold text-ink">
                {formatKcal(result.bmr)} × {result.multiplier} ≈ {formatKcal(result.tdee)} kcal
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-2xl bg-white/70 px-6 py-3 font-display text-base font-extrabold text-ink transition clay-sm hover:bg-white"
        >
          Edit inputs & recalculate
        </button>
        <div className="flex flex-1 items-start gap-2.5 rounded-2xl bg-peach-soft p-4">
          <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-peach text-xs font-extrabold text-white">
            i
          </span>
          <p className="text-xs font-semibold leading-relaxed text-ink/70">
            This calculator provides an estimate for general educational purposes. Individual energy needs
            vary. It is not a diagnosis or medical prescription — consult a qualified healthcare
            professional for personal guidance.
          </p>
        </div>
      </div>
    </div>
  );
}

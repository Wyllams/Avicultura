"use client";

import { useEffect, useState } from "react";
import { getFarmWeather, type WeatherData } from "@/app/actions/weather";
import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  CloudSnow,
  Droplets,
  MapPin,
} from "lucide-react";

interface WeatherWidgetProps {
  farmId: string;
}

export function WeatherWidget({ farmId }: WeatherWidgetProps) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getFarmWeather(farmId)
      .then((res) => {
        if (!isMounted) return;
        if (res.error) {
          setError(res.error);
        } else if (res.data) {
          setData(res.data);
        }
      })
      .catch(() => {
        if (isMounted) setError("Erro ao carregar o clima");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [farmId]);

  if (loading) {
    return (
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant animate-pulse h-[140px] flex flex-col justify-center">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-surface-container-high" />
          <div className="flex-1">
            <div className="h-4 bg-surface-container-high rounded w-24 mb-2" />
            <div className="h-8 bg-surface-container-high rounded w-16" />
          </div>
        </div>
      </div>
    );
  }

  // WMO Weather interpretation codes
  const getWeatherInfo = (code: number, isDay: number) => {
    const day = isDay === 1;

    let Icon = day ? Sun : Moon;
    let text = day ? "Céu limpo" : "Noite limpa";

    if (code === 1 || code === 2) {
      Icon = day ? CloudSun : CloudMoon;
      text = "Parcial. Nublado";
    } else if (code === 3) {
      Icon = Cloud;
      text = "Nublado";
    } else if (code === 45 || code === 48) {
      Icon = CloudFog;
      text = "Neblina";
    } else if (code >= 51 && code <= 55) {
      Icon = CloudDrizzle;
      text = "Garoa";
    } else if (code >= 61 && code <= 65) {
      Icon = CloudRain;
      text = "Chuva";
    } else if (code >= 71 && code <= 77) {
      Icon = CloudSnow;
      text = "Neve";
    } else if (code >= 80 && code <= 82) {
      Icon = CloudRain;
      text = "Pancadas de Chuva";
    } else if (code >= 95 && code <= 99) {
      Icon = CloudLightning;
      text = "Tempestade";
    }

    return { Icon, text, isDayClass: day ? "text-amber-500" : "text-indigo-400" };
  };

  if (error === "Endereço incompleto" || (!data && error)) {
    return (
      <div className="bg-surface-container p-6 rounded-2xl border border-outline-variant flex flex-col items-center justify-center text-center">
        <div className="w-10 h-10 rounded-full bg-[#1A5E35]/10 flex items-center justify-center mb-3">
          <MapPin className="w-5 h-5 text-[#1A5E35]" />
        </div>
        <h3 className="text-sm font-bold text-foreground mb-1">Clima Indisponível</h3>
        <p className="text-xs text-on-surface-variant max-w-[200px]">
          {error === "Endereço incompleto"
            ? "Edite sua granja e adicione a cidade para ver a previsão do tempo aqui."
            : error}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { Icon, text, isDayClass } = getWeatherInfo(data.conditionCode, data.isDay);

  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant relative overflow-hidden">
      {/* Decorative gradient blur in the background */}
      <div
        className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full pointer-events-none ${
          data.isDay ? "bg-amber-400" : "bg-indigo-500"
        }`}
      />

      <div className="flex justify-between items-start mb-1 relative z-10">
        <h2 className="font-manrope font-bold text-lg">Clima Agora</h2>
        <div className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-1 rounded-md">
          <MapPin className="w-3 h-3" />
          {data.cityName}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 relative z-10">
        <Icon className={`w-12 h-12 ${isDayClass}`} strokeWidth={1.5} />
        
        <div>
          <div className="text-3xl font-manrope font-bold text-foreground flex items-start">
            {Math.round(data.temperature)}
            <span className="text-lg font-medium text-on-surface-variant ml-0.5 mt-1">°C</span>
          </div>
          <p className="text-sm font-medium text-on-surface mt-0.5">{text}</p>
        </div>

        <div className="ml-auto flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium bg-surface-container-high px-2 py-1.5 rounded-lg">
            <Droplets className="w-3.5 h-3.5 text-blue-500" />
            {data.humidity}%
          </div>
        </div>
      </div>
    </div>
  );
}

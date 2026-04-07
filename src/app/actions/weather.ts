"use server";

import supabaseAdmin from "@/lib/supabase/admin";

export interface WeatherData {
  temperature: number;
  humidity: number;
  conditionCode: number;
  isDay: number;
  cityName: string;
}

export async function getFarmWeather(farmId: string): Promise<{ data?: WeatherData; error?: string }> {
  try {
    if (!farmId) {
      return { error: "ID da granja não fornecido." };
    }

    // 1. Busca a granja e sua localização
    const { data: farm, error: farmError } = await supabaseAdmin
      .from("Farm")
      .select("city, state")
      .eq("id", farmId)
      .single();

    if (farmError || !farm) {
      return { error: "Granja não encontrada." };
    }

    if (!farm.city) {
      return { error: "Endereço incompleto" }; // Retornamos erro sutil pra não poluir, e a UI mostra "Configure a cidade".
    }

    // 2. Transforma cidade em Latitude/Longitude via Open-Meteo Geocoding
    // Fazendo cache forte aqui, porque a Lat/Long de uma cidade não muda
    // Usaremos apenas o nome da cidade para evitar conflitos na busca da Open-Meteo
    const geoQuery = farm.city;
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      geoQuery
    )}&count=1&language=pt&format=json`;

    const geoRes = await fetch(geoUrl); // Bypass explicit next caching
    if (!geoRes.ok) throw new Error(`Erro na API de Geocoding: ${geoRes.status}`);

    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      return { error: "Localização não encontrada no mapa." };
    }

    const { latitude, longitude, name } = geoData.results[0];

    // 3. Busca a Previsão do Tempo atual (Forecast)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,is_day,weather_code&timezone=America%2FSao_Paulo`;

    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error(`Erro na API de Previsão: ${weatherRes.status}`);

    const weatherData = await weatherRes.json();

    if (!weatherData.current) {
      return { error: "Sem dados para o momento atual." };
    }

    return {
      data: {
        temperature: weatherData.current.temperature_2m,
        humidity: weatherData.current.relative_humidity_2m,
        conditionCode: weatherData.current.weather_code,
        isDay: weatherData.current.is_day,
        cityName: name, // Nome padronizado retornado pela API
      },
    };
  } catch (error: any) {
    console.error("[getFarmWeather] Exception:", error);
    return { error: `Exceção: ${error.message || String(error)}` };
  }
}

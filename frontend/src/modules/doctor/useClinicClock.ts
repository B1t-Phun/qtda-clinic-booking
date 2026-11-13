'use client';
import { useEffect, useState } from 'react';
export function useClinicClock(){
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),15000);return()=>clearInterval(timer);},[]);
  return now;
}

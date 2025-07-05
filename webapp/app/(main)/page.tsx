"use client"

import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();
  return <div>{t('home.welcome')}</div>;
} 
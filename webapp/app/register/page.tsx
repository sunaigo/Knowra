import React from 'react';
import { useTranslation } from 'react-i18next';

export default function RegisterPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10">
      <div>{t('register.title')}</div>
    </div>
  );
} 
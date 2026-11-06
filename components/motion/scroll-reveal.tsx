"use client";

import { createContext, useContext, type ReactNode } from "react";
import { motion, type HTMLMotionProps, type Variants } from "motion/react";
import { useMotionPrefs } from "@/components/motion/use-motion-prefs";
import { cn } from "cn";

interface ScrollRevealProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  yOffset?: number;
  viewportMargin?: string;
  once?: boolean;
}

/**
 * Componente de revelación al scroll optimizado para la GPU.
 * Utiliza solo `opacity` y `transform: translateY` con curvas Bézier naturales.
 * Se desactiva automáticamente si el usuario tiene `prefers-reduced-motion` activado.
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  duration,
  yOffset = 18,
  viewportMargin = "-60px",
  once = true,
  ...props
}: ScrollRevealProps) {
  const { reduce, duration: defaultDuration } = useMotionPrefs();
  const animDuration = duration ?? defaultDuration;

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: viewportMargin }}
      transition={{
        duration: animDuration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

const StaggerContext = createContext<{ reduce: boolean }>({ reduce: false });

interface StaggerGroupProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  delayChildren?: number;
  viewportMargin?: string;
  once?: boolean;
}

/**
 * Contenedor que aplica stagger progresivo a sus elementos hijos directos (<StaggerItem />).
 */
export function StaggerGroup({
  children,
  className,
  staggerDelay = 0.08,
  delayChildren = 0.05,
  viewportMargin = "-50px",
  once = true,
  ...props
}: StaggerGroupProps) {
  const { reduce } = useMotionPrefs();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };

  return (
    <StaggerContext.Provider value={{ reduce }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: viewportMargin }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </StaggerContext.Provider>
  );
}

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  yOffset?: number;
}

export function StaggerItem({
  children,
  className,
  yOffset = 16,
  ...props
}: StaggerItemProps) {
  const { reduce } = useContext(StaggerContext);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: yOffset },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className} {...props}>
      {children}
    </motion.div>
  );
}


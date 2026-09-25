import React, { forwardRef } from 'react';

const MOTION_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'whileInView',
  'viewport',
  'layout',
  'layoutId',
  'layoutDependency',
  'layoutScroll',
  'layoutRoot',
  'drag',
  'dragConstraints',
  'dragElastic',
  'dragMomentum',
  'dragPropagation',
  'dragSnapToOrigin',
  'dragTransition',
  'onDragStart',
  'onDragEnd',
  'onDrag',
  'onDirectionLock',
  'onDragTransitionEnd',
  'onAnimationStart',
  'onAnimationComplete',
  'onUpdate',
  'onLayoutAnimationStart',
  'onLayoutAnimationComplete',
  'transformTemplate',
  'custom',
  'inherit',
]);

function createMotionComponent(tag: string) {
  const Component = forwardRef<any, any>((props, ref) => {
    const cleanProps: Record<string, any> = { ref };
    for (const key in props) {
      if (!MOTION_PROPS.has(key)) {
        cleanProps[key] = props[key];
      }
    }
    return React.createElement(tag, cleanProps, props.children);
  });
  Component.displayName = `motion.${tag}`;
  return Component;
}

const componentCache = new Map<string, any>();

export const motion: any = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (prop === 'create' || prop === 'custom') {
        return (Comp: any) => Comp;
      }
      if (!componentCache.has(prop)) {
        componentCache.set(prop, createMotionComponent(prop));
      }
      return componentCache.get(prop);
    },
  }
);

export const AnimatePresence: React.FC<{
  children?: React.ReactNode;
  mode?: string;
  initial?: boolean;
  onExitComplete?: () => void;
}> = ({ children }) => <>{children}</>;

export const useAnimation = () => ({
  start: () => Promise.resolve(),
  stop: () => {},
  set: () => {},
});

export const useMotionValue = (initial: any) => ({
  get: () => initial,
  set: () => {},
  onChange: () => () => {},
});

export const useTransform = (_value: any, _input?: any, output?: any) => ({
  get: () => (Array.isArray(output) ? output[0] : 0),
});

export const useSpring = (value: any) => value;
export const useReducedMotion = () => true;

export default motion;

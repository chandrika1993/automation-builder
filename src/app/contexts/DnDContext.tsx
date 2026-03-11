"use client";

import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";

type ContextType = {
  type: string;
  setType: (type: string) => void;
};

const DnDContext = createContext<ContextType>({} as ContextType);

export const DnDProvider = ({ children }: PropsWithChildren) => {
  const [type, setType] = useState<string>("");

  const value = useMemo(() => {
    return { type, setType };
  }, [type]);

  return <DnDContext.Provider value={value}>{children}</DnDContext.Provider>;
};

export default DnDContext;

export const useDnD = () => {
  return useContext(DnDContext);
};

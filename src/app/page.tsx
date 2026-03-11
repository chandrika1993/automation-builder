import { ReactFlowProvider } from "@xyflow/react";
import AutomationBuilder from "./components/AutomationBuilder";
import { DnDProvider } from "./contexts/DnDContext";
import styles from "./page.module.css";

const Home = () => {
  return (
    <div className={styles.main}>
      <ReactFlowProvider>
        <DnDProvider>
          <AutomationBuilder />
        </DnDProvider>
      </ReactFlowProvider>
    </div>
  );
};

export default Home;

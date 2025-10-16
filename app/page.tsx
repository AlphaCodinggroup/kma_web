import { redirect } from "next/navigation";

const Home: React.FC = async () => {
  redirect("/login");
};

export default Home;

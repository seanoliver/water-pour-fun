import Head from "next/head"
import { GameContainer } from "@/components/GameContainer"

export default function Home() {
  return (
    <div>
      <Head>
        <title>Water Pour Fun</title>
        <meta name="description" content="The simple game of pouring water" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <h1>Water Pour Fun</h1>
        <GameContainer />
      </main>
    </div>
  )
}

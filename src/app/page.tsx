import Head from "next/head"
import { GameContainer } from "@/components/GameContainer"
import Link from "next/link"

export default function Home() {
  return (
    <div>
      <Head>
        <title>Water Pour Fun</title>
        <meta name="description" content="The simple game of pouring water" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex flex-col h-full justify-between">
        <header className="text-center">
          <h1 className="text-center text-2xl font-bold">Water</h1>
          <p className="text-center text-sm">
            Consolidate colors by pouring water.{" "}
            <Link
              href="https://en.wikipedia.org/wiki/Water_pouring_puzzle"
              target="_blank"
              className="underline"
            >
              Click here
            </Link>{" "}
            to learn more.
          </p>
        </header>
        <main className="flex justify-center items-center">
          <GameContainer />
        </main>
        <footer className="text-center text-sm">
          <p>
            Made with ❤️ by{" "}
            <Link
              href="https://github.com/seanoliver"
              target="_blank"
              className="underline"
            >
              Sean
            </Link>{" "}
            in San Francisco.
          </p>
        </footer>
      </div>
    </div>
  )
}

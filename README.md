# Game-Theoretic Analysis of EV Charging Station Competition

Interactive simulator of price competition between two EV charging stations. It builds the full 8 × 8 payoff matrix from a multinomial logit demand model, finds best responses and every pure-strategy Nash equilibrium, and explains the result. Everything runs in the browser; there is no backend.

## Links

- [Live simulator](https://ev-charging-game-theory.vercel.app)
- [GitHub repository](https://github.com/namitachhabra21-droid/ev-charging-game-theory)

Hosted on Vercel and connected to this repository for automatic deployments when changes are pushed to `main`.

## Run it

```bash
npm install
npm run dev        # open the printed http://localhost:5173 URL
npm test           # unit tests for the model
npm run build      # production build in dist/
```

## Where the maths lives

| File | What it does |
|---|---|
| `src/lib/model.ts` | Utility, stable logit shares, profit, payoff matrix, best responses, Nash equilibria, deviation test, input validation |
| `src/lib/scenarios.ts` | Default parameters and the three comparison scenarios |
| `src/lib/explain.ts` | Auto-generated explanation, clipboard summary and CSV export |
| `src/components/` | UI sections (controls, payoff matrix, results, charts, scenario table, formulas, methodology modal) |

## Note on multiple equilibria

Prices move in ₹2 steps, so the continuous equilibrium price usually falls between two grid points. Some scenarios therefore have two adjacent pure equilibria. The app lists all of them and features the one with the highest joint profit, flagging it when it is payoff-dominant.

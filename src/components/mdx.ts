/** 레슨 MDX에서 import 없이 쓸 수 있는 컴포넌트들 */
import Screen from './screen/Screen.astro';
import S from './screen/S.astro';
import Later from './screen/Later.astro';
import Define from './kinds/Define.astro';
import Formula from './kinds/Formula.astro';
import FormulaBuild from './kinds/FormulaBuild.astro';
import Concept from './kinds/Concept.astro';
import SymTable from './kinds/SymTable.astro';
import Check from './kinds/Check.astro';
import Numeric from './kinds/Numeric.astro';
import Analogy from './kinds/Analogy.astro';
import DailyProblem from './kinds/DailyProblem.astro';
import ThreeLines from './kinds/ThreeLines.astro';
import Reflect from './kinds/Reflect.astro';
import Key from './kinds/Key.astro';
import Note from './kinds/Note.astro';
import Recap from './kinds/Recap.astro';
import OneLine from './kinds/OneLine.astro';
import Quote from './kinds/Quote.astro';
import Plot from './figures/Plot.astro';
import BigNumber from './figures/BigNumber.astro';
import DataTable from './figures/DataTable.astro';
import Flow from './figures/Flow.astro';
import Panels from './figures/Panels.astro';
import Icon from './figures/Icon.astro';
import SlitGeometry from './figures/SlitGeometry.astro';
import { sims } from './sims/index.ts';

export const mdxComponents = {
  Screen,
  S,
  Later,
  Define,
  Formula,
  FormulaBuild,
  Concept,
  SymTable,
  Check,
  Numeric,
  Analogy,
  DailyProblem,
  ThreeLines,
  Reflect,
  Key,
  Note,
  Recap,
  OneLine,
  Quote,
  Plot,
  BigNumber,
  DataTable,
  Flow,
  Panels,
  Icon,
  SlitGeometry,
  ...sims,
};

// Common Czech foods — nutrition per 100 g (or per 100 ml for liquids)
// Source: averaged values from kaloricketabulky.cz / kaloricitabulky for typical CZ products

export interface FoodItem {
  id: string;
  name: string;
  per: number; // base portion in grams (always 100)
  defaultGrams: number; // typical 1-portion estimate
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  category: 'pecivo' | 'maso' | 'mlecne' | 'ovoce' | 'zelenina' | 'priloha' | 'napoj' | 'snack' | 'hlavni' | 'jine';
  tags?: string[];
  // For naturally-counted foods: typical grams per piece + a Czech label
  // ("vejce", "rohlík", "ks"). When set, the picker shows a piece counter
  // instead of (or in addition to) the grams slider.
  pieceGrams?: number;
  pieceLabel?: string;
}

export const FOODS_DB: FoodItem[] = [
  // PEČIVO
  { id: 'rohlik-bily', name: 'Rohlík bílý', per: 100, defaultGrams: 43, kcal: 287, protein_g: 9, carbs_g: 56, fat_g: 2.4, category: 'pecivo', tags: ['houska'], pieceGrams: 43, pieceLabel: 'rohlík' },
  { id: 'rohlik-tuk', name: 'Rohlík tukový', per: 100, defaultGrams: 43, kcal: 320, protein_g: 8.5, carbs_g: 53, fat_g: 7, category: 'pecivo', pieceGrams: 43, pieceLabel: 'rohlík' },
  { id: 'houska-cela', name: 'Houska celozrnná', per: 100, defaultGrams: 60, kcal: 248, protein_g: 9, carbs_g: 45, fat_g: 3, category: 'pecivo', pieceGrams: 60, pieceLabel: 'houska' },
  { id: 'chleba-konzum', name: 'Chléb konzumní', per: 100, defaultGrams: 50, kcal: 246, protein_g: 7.5, carbs_g: 49, fat_g: 1.4, category: 'pecivo', pieceGrams: 50, pieceLabel: 'krajíc' },
  { id: 'chleba-zitno', name: 'Chléb žitný', per: 100, defaultGrams: 50, kcal: 235, protein_g: 7, carbs_g: 47, fat_g: 1.2, category: 'pecivo', pieceGrams: 50, pieceLabel: 'krajíc' },
  { id: 'toast-bily', name: 'Toustový chléb bílý', per: 100, defaultGrams: 28, kcal: 270, protein_g: 8, carbs_g: 49, fat_g: 4, category: 'pecivo', pieceGrams: 28, pieceLabel: 'plátek' },
  { id: 'kaiser', name: 'Kaiserka', per: 100, defaultGrams: 50, kcal: 290, protein_g: 9, carbs_g: 55, fat_g: 3, category: 'pecivo', pieceGrams: 50, pieceLabel: 'kaiserka' },
  { id: 'bageta', name: 'Bageta francouzská', per: 100, defaultGrams: 250, kcal: 270, protein_g: 8.5, carbs_g: 55, fat_g: 1.5, category: 'pecivo', pieceGrams: 250, pieceLabel: 'bageta' },
  { id: 'croissant', name: 'Croissant máslový', per: 100, defaultGrams: 60, kcal: 406, protein_g: 8, carbs_g: 45, fat_g: 21, category: 'pecivo', pieceGrams: 60, pieceLabel: 'croissant' },

  // MASO
  { id: 'kureci-prsa', name: 'Kuřecí prsa (vařené)', per: 100, defaultGrams: 150, kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6, category: 'maso' },
  { id: 'kureci-stehno', name: 'Kuřecí stehno (pečené)', per: 100, defaultGrams: 200, kcal: 209, protein_g: 26, carbs_g: 0, fat_g: 11, category: 'maso' },
  { id: 'veproveho-pecene', name: 'Vepřové pečené', per: 100, defaultGrams: 150, kcal: 290, protein_g: 25, carbs_g: 0, fat_g: 21, category: 'maso' },
  { id: 'sunka-debrecin', name: 'Šunka debrecínská', per: 100, defaultGrams: 30, kcal: 220, protein_g: 18, carbs_g: 1, fat_g: 16, category: 'maso' },
  { id: 'sunka-drubez', name: 'Šunka kuřecí (light)', per: 100, defaultGrams: 30, kcal: 105, protein_g: 18, carbs_g: 1, fat_g: 3, category: 'maso' },
  { id: 'salam-vysocina', name: 'Vysočina salám', per: 100, defaultGrams: 30, kcal: 405, protein_g: 18, carbs_g: 1, fat_g: 36, category: 'maso' },
  { id: 'parky', name: 'Párek vídeňský', per: 100, defaultGrams: 80, kcal: 290, protein_g: 12, carbs_g: 2, fat_g: 26, category: 'maso' },
  { id: 'tunak-konz', name: 'Tuňák ve vlastní šťávě', per: 100, defaultGrams: 80, kcal: 110, protein_g: 26, carbs_g: 0, fat_g: 1, category: 'maso' },
  { id: 'losos-grilovany', name: 'Losos (grilovaný)', per: 100, defaultGrams: 130, kcal: 208, protein_g: 22, carbs_g: 0, fat_g: 13, category: 'maso' },

  // MLÉČNÉ
  { id: 'mleko-15', name: 'Mléko polotučné 1,5%', per: 100, defaultGrams: 250, kcal: 47, protein_g: 3.4, carbs_g: 4.8, fat_g: 1.5, category: 'mlecne', tags: ['polotucne'] },
  { id: 'mleko-32', name: 'Mléko plnotučné 3,5%', per: 100, defaultGrams: 250, kcal: 64, protein_g: 3.3, carbs_g: 4.7, fat_g: 3.5, category: 'mlecne' },
  { id: 'jogurt-bily', name: 'Jogurt bílý 3%', per: 100, defaultGrams: 150, kcal: 60, protein_g: 4.5, carbs_g: 5, fat_g: 3, category: 'mlecne' },
  { id: 'jogurt-recky', name: 'Jogurt řecký 0%', per: 100, defaultGrams: 150, kcal: 59, protein_g: 10, carbs_g: 4, fat_g: 0.4, category: 'mlecne' },
  { id: 'tvaroh-tucny', name: 'Tvaroh tučný', per: 100, defaultGrams: 100, kcal: 156, protein_g: 14, carbs_g: 3, fat_g: 10, category: 'mlecne' },
  { id: 'tvaroh-light', name: 'Tvaroh odtučněný', per: 100, defaultGrams: 100, kcal: 65, protein_g: 14, carbs_g: 3, fat_g: 0.3, category: 'mlecne' },
  { id: 'cottage', name: 'Cottage', per: 100, defaultGrams: 180, kcal: 85, protein_g: 12, carbs_g: 3, fat_g: 3, category: 'mlecne' },
  { id: 'eidam-30', name: 'Eidam 30%', per: 100, defaultGrams: 30, kcal: 246, protein_g: 28, carbs_g: 0.5, fat_g: 15, category: 'mlecne' },
  { id: 'mozzarella', name: 'Mozzarella light', per: 100, defaultGrams: 50, kcal: 178, protein_g: 18, carbs_g: 1, fat_g: 12, category: 'mlecne' },
  { id: 'maslo', name: 'Máslo', per: 100, defaultGrams: 10, kcal: 717, protein_g: 0.8, carbs_g: 0.7, fat_g: 81, category: 'mlecne' },

  // VEJCE
  { id: 'vejce-cele', name: 'Vejce slepičí', per: 100, defaultGrams: 60, kcal: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11, category: 'jine', tags: ['vajicko', 'vajicka', 'cele'], pieceGrams: 60, pieceLabel: 'vejce' },
  { id: 'vejce-bilek', name: 'Bílek vaječný', per: 100, defaultGrams: 33, kcal: 52, protein_g: 11, carbs_g: 0.7, fat_g: 0.2, category: 'jine', tags: ['vajecny'], pieceGrams: 33, pieceLabel: 'bílek' },
  { id: 'vejce-zloutek', name: 'Žloutek vaječný', per: 100, defaultGrams: 17, kcal: 322, protein_g: 16, carbs_g: 3.6, fat_g: 27, category: 'jine', tags: ['vajecny'], pieceGrams: 17, pieceLabel: 'žloutek' },
  { id: 'vejce-volske-oko', name: 'Volské oko (sázené vejce)', per: 100, defaultGrams: 65, kcal: 196, protein_g: 14, carbs_g: 0.8, fat_g: 15, category: 'jine', tags: ['volske', 'oko', 'sazene', 'smazene', 'vajicko', 'vajicka', 'na panvi'], pieceGrams: 65, pieceLabel: 'oko' },
  { id: 'vejce-natvrdo', name: 'Vejce vařené natvrdo', per: 100, defaultGrams: 60, kcal: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11, category: 'jine', tags: ['vajicko', 'vareny', 'tvrdy'], pieceGrams: 60, pieceLabel: 'vejce' },
  { id: 'vejce-namekko', name: 'Vejce vařené naměkko', per: 100, defaultGrams: 60, kcal: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11, category: 'jine', tags: ['vajicko', 'vareny', 'mekky'], pieceGrams: 60, pieceLabel: 'vejce' },
  { id: 'vejce-poached', name: 'Pošírované vejce', per: 100, defaultGrams: 60, kcal: 143, protein_g: 13, carbs_g: 0.7, fat_g: 9.5, category: 'jine', tags: ['vajicko', 'posirovane', 'ztracene'], pieceGrams: 60, pieceLabel: 'vejce' },

  // OVOCE
  { id: 'jablko', name: 'Jablko', per: 100, defaultGrams: 180, kcal: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2, category: 'ovoce', pieceGrams: 180, pieceLabel: 'jablko' },
  { id: 'banan', name: 'Banán', per: 100, defaultGrams: 120, kcal: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3, category: 'ovoce', pieceGrams: 120, pieceLabel: 'banán' },
  { id: 'pomeranc', name: 'Pomeranč', per: 100, defaultGrams: 150, kcal: 47, protein_g: 0.9, carbs_g: 12, fat_g: 0.1, category: 'ovoce', pieceGrams: 150, pieceLabel: 'pomeranč' },
  { id: 'jahody', name: 'Jahody', per: 100, defaultGrams: 150, kcal: 32, protein_g: 0.7, carbs_g: 7.7, fat_g: 0.3, category: 'ovoce' },
  { id: 'boruvky', name: 'Borůvky', per: 100, defaultGrams: 100, kcal: 57, protein_g: 0.7, carbs_g: 14, fat_g: 0.3, category: 'ovoce' },
  { id: 'hroznove-vino', name: 'Hroznové víno', per: 100, defaultGrams: 100, kcal: 67, protein_g: 0.6, carbs_g: 17, fat_g: 0.4, category: 'ovoce' },

  // ZELENINA
  { id: 'okurka', name: 'Okurka salátová', per: 100, defaultGrams: 100, kcal: 16, protein_g: 0.6, carbs_g: 3.6, fat_g: 0.1, category: 'zelenina' },
  { id: 'rajce', name: 'Rajče', per: 100, defaultGrams: 120, kcal: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2, category: 'zelenina' },
  { id: 'paprika-cervena', name: 'Paprika červená', per: 100, defaultGrams: 100, kcal: 31, protein_g: 1, carbs_g: 6, fat_g: 0.3, category: 'zelenina' },
  { id: 'mrkev', name: 'Mrkev syrová', per: 100, defaultGrams: 80, kcal: 41, protein_g: 0.9, carbs_g: 9.6, fat_g: 0.2, category: 'zelenina' },
  { id: 'salat-ledovy', name: 'Salát ledový', per: 100, defaultGrams: 50, kcal: 14, protein_g: 0.9, carbs_g: 3, fat_g: 0.1, category: 'zelenina' },
  { id: 'brokolice', name: 'Brokolice (vařená)', per: 100, defaultGrams: 150, kcal: 35, protein_g: 2.4, carbs_g: 7, fat_g: 0.4, category: 'zelenina' },
  { id: 'brambory-vareny', name: 'Brambory vařené', per: 100, defaultGrams: 200, kcal: 87, protein_g: 1.9, carbs_g: 20, fat_g: 0.1, category: 'priloha' },
  { id: 'hranolky', name: 'Hranolky (smažené)', per: 100, defaultGrams: 150, kcal: 312, protein_g: 3.4, carbs_g: 41, fat_g: 15, category: 'priloha' },

  // PŘÍLOHY
  { id: 'ryze-bila-var', name: 'Rýže bílá vařená', per: 100, defaultGrams: 200, kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, category: 'priloha' },
  { id: 'ryze-jasmin', name: 'Rýže jasmínová vařená', per: 100, defaultGrams: 200, kcal: 129, protein_g: 2.7, carbs_g: 28, fat_g: 0.3, category: 'priloha' },
  { id: 'tateste', name: 'Těstoviny vařené', per: 100, defaultGrams: 200, kcal: 158, protein_g: 5.8, carbs_g: 31, fat_g: 0.9, category: 'priloha' },
  { id: 'kuskus', name: 'Kuskus vařený', per: 100, defaultGrams: 200, kcal: 112, protein_g: 3.8, carbs_g: 23, fat_g: 0.2, category: 'priloha' },
  { id: 'kvinoa', name: 'Quinoa vařená', per: 100, defaultGrams: 200, kcal: 120, protein_g: 4.4, carbs_g: 21, fat_g: 1.9, category: 'priloha' },
  { id: 'ovsene-vlocky', name: 'Ovesné vločky', per: 100, defaultGrams: 60, kcal: 379, protein_g: 13, carbs_g: 67, fat_g: 7, category: 'priloha' },
  { id: 'musli', name: 'Müsli', per: 100, defaultGrams: 50, kcal: 380, protein_g: 9, carbs_g: 65, fat_g: 8, category: 'snack' },

  // NÁPOJE
  { id: 'kava-cerna', name: 'Káva černá (espreso)', per: 100, defaultGrams: 30, kcal: 2, protein_g: 0.1, carbs_g: 0, fat_g: 0, category: 'napoj' },
  { id: 'kava-mlekem', name: 'Káva s mlékem (cappuccino)', per: 100, defaultGrams: 200, kcal: 35, protein_g: 1.7, carbs_g: 2.7, fat_g: 1.9, category: 'napoj' },
  { id: 'cola', name: 'Coca-Cola', per: 100, defaultGrams: 330, kcal: 42, protein_g: 0, carbs_g: 10.6, fat_g: 0, category: 'napoj' },
  { id: 'cola-zero', name: 'Coca-Cola Zero', per: 100, defaultGrams: 330, kcal: 0.3, protein_g: 0, carbs_g: 0, fat_g: 0, category: 'napoj' },
  { id: 'pivo-12', name: 'Pivo světlé 12° (4,2%)', per: 100, defaultGrams: 500, kcal: 43, protein_g: 0.4, carbs_g: 3.6, fat_g: 0, category: 'napoj' },
  { id: 'pivo-10', name: 'Pivo světlé 10° (3,5%)', per: 100, defaultGrams: 500, kcal: 35, protein_g: 0.4, carbs_g: 3, fat_g: 0, category: 'napoj' },
  { id: 'vino-bile', name: 'Víno bílé suché', per: 100, defaultGrams: 200, kcal: 82, protein_g: 0.1, carbs_g: 2.6, fat_g: 0, category: 'napoj' },
  { id: 'dzus-pomeranc', name: 'Pomerančový džus', per: 100, defaultGrams: 250, kcal: 45, protein_g: 0.7, carbs_g: 10, fat_g: 0.2, category: 'napoj' },

  // SNACK / SLADKÉ
  { id: 'orisky-vlasske', name: 'Vlašské ořechy', per: 100, defaultGrams: 30, kcal: 654, protein_g: 15, carbs_g: 14, fat_g: 65, category: 'snack' },
  { id: 'orisky-mandle', name: 'Mandle', per: 100, defaultGrams: 30, kcal: 579, protein_g: 21, carbs_g: 22, fat_g: 50, category: 'snack' },
  { id: 'cokolada-mlecna', name: 'Mléčná čokoláda', per: 100, defaultGrams: 25, kcal: 535, protein_g: 7, carbs_g: 60, fat_g: 30, category: 'snack' },
  { id: 'cokolada-horka', name: 'Hořká čokoláda 70%', per: 100, defaultGrams: 25, kcal: 598, protein_g: 7.8, carbs_g: 46, fat_g: 43, category: 'snack' },
  { id: 'sušenky-bebe', name: 'Sušenky BeBe', per: 100, defaultGrams: 50, kcal: 460, protein_g: 7, carbs_g: 70, fat_g: 17, category: 'snack' },
  { id: 'chipsy', name: 'Bramborové chipsy', per: 100, defaultGrams: 30, kcal: 540, protein_g: 6, carbs_g: 53, fat_g: 33, category: 'snack' },

  // MASO — rozšíření (syrové i grilované/pečené)
  { id: 'krkovicka-grilovana', name: 'Vepřová krkovička grilovaná', per: 100, defaultGrams: 200, kcal: 297, protein_g: 24, carbs_g: 0, fat_g: 22, category: 'maso', tags: ['grilovana','krkovice','vepro'] },
  { id: 'krkovicka-syrova', name: 'Vepřová krkovice syrová', per: 100, defaultGrams: 150, kcal: 270, protein_g: 17, carbs_g: 0, fat_g: 22, category: 'maso' },
  { id: 'vepro-pannenka', name: 'Vepřová panenka (pečená)', per: 100, defaultGrams: 150, kcal: 175, protein_g: 26, carbs_g: 0, fat_g: 8, category: 'maso' },
  { id: 'vepro-bok', name: 'Vepřový bok', per: 100, defaultGrams: 120, kcal: 518, protein_g: 9, carbs_g: 0, fat_g: 53, category: 'maso' },
  { id: 'vepro-kotleta', name: 'Vepřová kotleta', per: 100, defaultGrams: 180, kcal: 250, protein_g: 22, carbs_g: 0, fat_g: 18, category: 'maso' },
  { id: 'hovezi-svickova', name: 'Hovězí svíčková (maso)', per: 100, defaultGrams: 150, kcal: 158, protein_g: 22, carbs_g: 0, fat_g: 7.7, category: 'maso' },
  { id: 'hovezi-rostbef', name: 'Hovězí roastbeef', per: 100, defaultGrams: 150, kcal: 217, protein_g: 26, carbs_g: 0, fat_g: 12, category: 'maso' },
  { id: 'hovezi-mlete', name: 'Mleté hovězí 15%', per: 100, defaultGrams: 150, kcal: 254, protein_g: 17, carbs_g: 0, fat_g: 21, category: 'maso' },
  { id: 'mlete-mix', name: 'Mleté maso (vepřo-hovězí)', per: 100, defaultGrams: 150, kcal: 247, protein_g: 17, carbs_g: 0, fat_g: 20, category: 'maso' },
  { id: 'kureci-syrove', name: 'Kuřecí prsa syrová', per: 100, defaultGrams: 150, kcal: 110, protein_g: 23, carbs_g: 0, fat_g: 1.2, category: 'maso' },
  { id: 'krocan-prsa', name: 'Krůtí prsa', per: 100, defaultGrams: 150, kcal: 135, protein_g: 30, carbs_g: 0, fat_g: 1, category: 'maso' },
  { id: 'kachna-pecena', name: 'Kachna pečená', per: 100, defaultGrams: 200, kcal: 337, protein_g: 19, carbs_g: 0, fat_g: 28, category: 'maso' },
  { id: 'jelito', name: 'Jelito', per: 100, defaultGrams: 100, kcal: 320, protein_g: 13, carbs_g: 6, fat_g: 28, category: 'maso' },
  { id: 'jitrnice', name: 'Jitrnice', per: 100, defaultGrams: 100, kcal: 348, protein_g: 12, carbs_g: 4, fat_g: 32, category: 'maso' },
  { id: 'klobasa-spekacek', name: 'Špekáček', per: 100, defaultGrams: 110, kcal: 320, protein_g: 12, carbs_g: 1, fat_g: 30, category: 'maso' },
  { id: 'slanina', name: 'Anglická slanina', per: 100, defaultGrams: 30, kcal: 541, protein_g: 13, carbs_g: 1, fat_g: 53, category: 'maso' },
  { id: 'tresta', name: 'Treska (filé)', per: 100, defaultGrams: 150, kcal: 82, protein_g: 18, carbs_g: 0, fat_g: 0.7, category: 'maso' },
  { id: 'losos-syrovy', name: 'Losos syrový', per: 100, defaultGrams: 130, kcal: 208, protein_g: 20, carbs_g: 0, fat_g: 13, category: 'maso' },
  { id: 'krevety', name: 'Krevety vařené', per: 100, defaultGrams: 100, kcal: 99, protein_g: 24, carbs_g: 0.2, fat_g: 0.3, category: 'maso' },

  // HOTOVÁ JÍDLA (hlavní chody)
  { id: 'svickova-na-smetane', name: 'Svíčková na smetaně', per: 100, defaultGrams: 350, kcal: 175, protein_g: 9, carbs_g: 12, fat_g: 10, category: 'hlavni', tags: ['knedliky'] },
  { id: 'gulasova-polevka', name: 'Gulášová polévka', per: 100, defaultGrams: 300, kcal: 95, protein_g: 5, carbs_g: 6, fat_g: 5, category: 'hlavni' },
  { id: 'gulas-hovezi', name: 'Hovězí guláš', per: 100, defaultGrams: 250, kcal: 165, protein_g: 12, carbs_g: 6, fat_g: 10, category: 'hlavni' },
  { id: 'segedin', name: 'Segedínský guláš', per: 100, defaultGrams: 250, kcal: 145, protein_g: 9, carbs_g: 4, fat_g: 11, category: 'hlavni' },
  { id: 'vepro-knedlo-zelo', name: 'Vepřo knedlo zelo', per: 100, defaultGrams: 400, kcal: 195, protein_g: 9, carbs_g: 22, fat_g: 8, category: 'hlavni' },
  { id: 'rizek-vepr', name: 'Vepřový řízek smažený', per: 100, defaultGrams: 180, kcal: 280, protein_g: 22, carbs_g: 14, fat_g: 16, category: 'hlavni' },
  { id: 'rizek-kureci', name: 'Kuřecí řízek smažený', per: 100, defaultGrams: 150, kcal: 240, protein_g: 24, carbs_g: 12, fat_g: 11, category: 'hlavni' },
  { id: 'smazak', name: 'Smažený sýr', per: 100, defaultGrams: 130, kcal: 320, protein_g: 18, carbs_g: 14, fat_g: 22, category: 'hlavni' },
  { id: 'leco', name: 'Lečo s vejci', per: 100, defaultGrams: 250, kcal: 95, protein_g: 5, carbs_g: 5, fat_g: 6, category: 'hlavni' },
  { id: 'koprovka', name: 'Koprovka s vejci', per: 100, defaultGrams: 350, kcal: 105, protein_g: 4, carbs_g: 8, fat_g: 6, category: 'hlavni' },
  { id: 'cevabcici', name: 'Čevabčiči', per: 100, defaultGrams: 150, kcal: 270, protein_g: 16, carbs_g: 2, fat_g: 22, category: 'hlavni' },
  { id: 'kure-pecene', name: 'Pečené kuře', per: 100, defaultGrams: 250, kcal: 220, protein_g: 26, carbs_g: 0, fat_g: 13, category: 'hlavni' },
  { id: 'spagety-bolognese', name: 'Špagety boloňské', per: 100, defaultGrams: 350, kcal: 145, protein_g: 7, carbs_g: 18, fat_g: 5, category: 'hlavni' },
  { id: 'spagety-carbonara', name: 'Špagety carbonara', per: 100, defaultGrams: 350, kcal: 200, protein_g: 9, carbs_g: 22, fat_g: 9, category: 'hlavni' },
  { id: 'lasagne', name: 'Lasagne', per: 100, defaultGrams: 350, kcal: 175, protein_g: 9, carbs_g: 14, fat_g: 9, category: 'hlavni' },
  { id: 'pizza-margherita', name: 'Pizza Margherita', per: 100, defaultGrams: 300, kcal: 240, protein_g: 11, carbs_g: 31, fat_g: 8, category: 'hlavni' },
  { id: 'pizza-salami', name: 'Pizza salámová', per: 100, defaultGrams: 300, kcal: 280, protein_g: 12, carbs_g: 30, fat_g: 12, category: 'hlavni' },
  { id: 'risotto-houby', name: 'Houbové rizoto', per: 100, defaultGrams: 300, kcal: 145, protein_g: 4, carbs_g: 22, fat_g: 4, category: 'hlavni' },
  { id: 'kureci-na-paprice', name: 'Kuře na paprice', per: 100, defaultGrams: 300, kcal: 158, protein_g: 12, carbs_g: 4, fat_g: 10, category: 'hlavni' },
  { id: 'sunkofleky', name: 'Šunkofleky', per: 100, defaultGrams: 300, kcal: 175, protein_g: 9, carbs_g: 18, fat_g: 8, category: 'hlavni' },
  { id: 'rajska', name: 'Rajská omáčka s masem', per: 100, defaultGrams: 300, kcal: 130, protein_g: 8, carbs_g: 10, fat_g: 6, category: 'hlavni' },
  { id: 'cocka-na-kyselo', name: 'Čočka na kyselo', per: 100, defaultGrams: 250, kcal: 135, protein_g: 8, carbs_g: 18, fat_g: 3, category: 'hlavni' },
  { id: 'kureci-curry', name: 'Kuřecí curry', per: 100, defaultGrams: 300, kcal: 165, protein_g: 14, carbs_g: 6, fat_g: 9, category: 'hlavni' },
  { id: 'burrito-kureci', name: 'Burrito kuřecí', per: 100, defaultGrams: 250, kcal: 215, protein_g: 12, carbs_g: 22, fat_g: 9, category: 'hlavni' },
  { id: 'burger-hovezi', name: 'Hovězí burger v housce', per: 100, defaultGrams: 220, kcal: 250, protein_g: 14, carbs_g: 19, fat_g: 13, category: 'hlavni' },
  { id: 'kebab', name: 'Kebab v pita', per: 100, defaultGrams: 350, kcal: 215, protein_g: 13, carbs_g: 18, fat_g: 11, category: 'hlavni' },
  { id: 'sushi-makis', name: 'Sushi makis (8 ks)', per: 100, defaultGrams: 200, kcal: 150, protein_g: 6, carbs_g: 26, fat_g: 2.5, category: 'hlavni' },

  // PŘÍLOHY — knedlíky a další
  { id: 'knedlik-hous', name: 'Houskový knedlík', per: 100, defaultGrams: 100, kcal: 240, protein_g: 8, carbs_g: 47, fat_g: 1.5, category: 'priloha' },
  { id: 'knedlik-bram', name: 'Bramborový knedlík', per: 100, defaultGrams: 120, kcal: 175, protein_g: 4, carbs_g: 38, fat_g: 0.8, category: 'priloha' },
  { id: 'brambory-pecene', name: 'Brambory pečené', per: 100, defaultGrams: 200, kcal: 110, protein_g: 2.4, carbs_g: 23, fat_g: 0.6, category: 'priloha' },
  { id: 'pure-bramb', name: 'Bramborová kaše', per: 100, defaultGrams: 200, kcal: 110, protein_g: 2, carbs_g: 17, fat_g: 4, category: 'priloha' },
  { id: 'ryze-natural', name: 'Rýže natural vařená', per: 100, defaultGrams: 200, kcal: 123, protein_g: 2.7, carbs_g: 26, fat_g: 1, category: 'priloha' },
  { id: 'bulgur', name: 'Bulgur vařený', per: 100, defaultGrams: 200, kcal: 83, protein_g: 3.1, carbs_g: 19, fat_g: 0.2, category: 'priloha' },

  // PEČIVO — doplnění
  { id: 'pita', name: 'Pita placka', per: 100, defaultGrams: 60, kcal: 275, protein_g: 9, carbs_g: 55, fat_g: 1.2, category: 'pecivo' },
  { id: 'tortilla', name: 'Tortilla pšeničná', per: 100, defaultGrams: 60, kcal: 304, protein_g: 8, carbs_g: 50, fat_g: 7, category: 'pecivo' },
  { id: 'knackebrot', name: 'Knäckebrot', per: 100, defaultGrams: 20, kcal: 366, protein_g: 11, carbs_g: 67, fat_g: 4, category: 'pecivo' },

  // VEJCE — pokračování
  { id: 'vejce-michana', name: 'Míchaná vejce (s máslem)', per: 100, defaultGrams: 150, kcal: 196, protein_g: 13, carbs_g: 1.6, fat_g: 15, category: 'jine', tags: ['michana', 'vajicka', 'vajicko', 'scrambled'] },
  { id: 'omeleta', name: 'Omeleta se sýrem', per: 100, defaultGrams: 150, kcal: 220, protein_g: 14, carbs_g: 2, fat_g: 17, category: 'jine', tags: ['vajicka', 'vajicko'] },
  { id: 'omeleta-jen', name: 'Omeleta vaječná', per: 100, defaultGrams: 120, kcal: 154, protein_g: 11, carbs_g: 0.6, fat_g: 12, category: 'jine', tags: ['vajicka', 'vajicko'] },
  { id: 'kase-ovesna', name: 'Ovesná kaše s mlékem', per: 100, defaultGrams: 250, kcal: 105, protein_g: 4, carbs_g: 16, fat_g: 2.5, category: 'jine' },
  { id: 'palacinky', name: 'Palačinky s marmeládou', per: 100, defaultGrams: 150, kcal: 230, protein_g: 6, carbs_g: 35, fat_g: 7, category: 'jine' },

  // OVOCE — doplnění
  { id: 'hruska', name: 'Hruška', per: 100, defaultGrams: 180, kcal: 57, protein_g: 0.4, carbs_g: 15, fat_g: 0.1, category: 'ovoce', pieceGrams: 180, pieceLabel: 'hruška' },
  { id: 'broskev', name: 'Broskev', per: 100, defaultGrams: 150, kcal: 39, protein_g: 0.9, carbs_g: 9.5, fat_g: 0.3, category: 'ovoce', pieceGrams: 150, pieceLabel: 'broskev' },
  { id: 'merunka', name: 'Meruňka', per: 100, defaultGrams: 40, kcal: 48, protein_g: 1.4, carbs_g: 11, fat_g: 0.4, category: 'ovoce', pieceGrams: 40, pieceLabel: 'meruňka' },
  { id: 'svestka', name: 'Švestka', per: 100, defaultGrams: 40, kcal: 46, protein_g: 0.7, carbs_g: 11, fat_g: 0.3, category: 'ovoce', pieceGrams: 40, pieceLabel: 'švestka' },
  { id: 'malina', name: 'Maliny', per: 100, defaultGrams: 100, kcal: 52, protein_g: 1.2, carbs_g: 12, fat_g: 0.7, category: 'ovoce' },
  { id: 'kiwi', name: 'Kiwi', per: 100, defaultGrams: 80, kcal: 61, protein_g: 1.1, carbs_g: 15, fat_g: 0.5, category: 'ovoce', pieceGrams: 80, pieceLabel: 'kiwi' },
  { id: 'mango', name: 'Mango', per: 100, defaultGrams: 200, kcal: 60, protein_g: 0.8, carbs_g: 15, fat_g: 0.4, category: 'ovoce', pieceGrams: 200, pieceLabel: 'mango' },
  { id: 'ananas', name: 'Ananas', per: 100, defaultGrams: 150, kcal: 50, protein_g: 0.5, carbs_g: 13, fat_g: 0.1, category: 'ovoce' },
  { id: 'meloun-vodni', name: 'Vodní meloun', per: 100, defaultGrams: 200, kcal: 30, protein_g: 0.6, carbs_g: 7.6, fat_g: 0.2, category: 'ovoce' },
  { id: 'mandarinka', name: 'Mandarinka', per: 100, defaultGrams: 90, kcal: 53, protein_g: 0.8, carbs_g: 13, fat_g: 0.3, category: 'ovoce', pieceGrams: 90, pieceLabel: 'mandarinka' },
  { id: 'avokado', name: 'Avokádo', per: 100, defaultGrams: 150, kcal: 160, protein_g: 2, carbs_g: 9, fat_g: 15, category: 'ovoce' },

  // ZELENINA — doplnění
  { id: 'cibule', name: 'Cibule', per: 100, defaultGrams: 50, kcal: 40, protein_g: 1.1, carbs_g: 9.3, fat_g: 0.1, category: 'zelenina' },
  { id: 'cesnek', name: 'Česnek', per: 100, defaultGrams: 5, kcal: 149, protein_g: 6.4, carbs_g: 33, fat_g: 0.5, category: 'zelenina' },
  { id: 'kvetak', name: 'Květák vařený', per: 100, defaultGrams: 150, kcal: 25, protein_g: 1.9, carbs_g: 5, fat_g: 0.3, category: 'zelenina' },
  { id: 'spenat', name: 'Špenát listový', per: 100, defaultGrams: 100, kcal: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4, category: 'zelenina' },
  { id: 'cuketa', name: 'Cuketa', per: 100, defaultGrams: 150, kcal: 17, protein_g: 1.2, carbs_g: 3.1, fat_g: 0.3, category: 'zelenina' },
  { id: 'lilek', name: 'Lilek', per: 100, defaultGrams: 150, kcal: 25, protein_g: 1, carbs_g: 6, fat_g: 0.2, category: 'zelenina' },
  { id: 'kukurice', name: 'Kukuřice (sterilovaná)', per: 100, defaultGrams: 100, kcal: 86, protein_g: 3, carbs_g: 19, fat_g: 1.4, category: 'zelenina' },
  { id: 'fazolky', name: 'Fazolové lusky', per: 100, defaultGrams: 100, kcal: 31, protein_g: 1.8, carbs_g: 7, fat_g: 0.2, category: 'zelenina' },
  { id: 'olivy', name: 'Olivy zelené', per: 100, defaultGrams: 30, kcal: 145, protein_g: 1, carbs_g: 4, fat_g: 15, category: 'zelenina' },

  // MLÉČNÉ — doplnění
  { id: 'tvaroh-polotuc', name: 'Tvaroh polotučný', per: 100, defaultGrams: 100, kcal: 100, protein_g: 14, carbs_g: 3, fat_g: 4, category: 'mlecne' },
  { id: 'smetana-12', name: 'Smetana 12%', per: 100, defaultGrams: 50, kcal: 130, protein_g: 3, carbs_g: 4, fat_g: 12, category: 'mlecne' },
  { id: 'smetana-33', name: 'Smetana 33% ke šlehání', per: 100, defaultGrams: 50, kcal: 320, protein_g: 2.1, carbs_g: 2.8, fat_g: 33, category: 'mlecne' },
  { id: 'gouda', name: 'Gouda 45%', per: 100, defaultGrams: 30, kcal: 356, protein_g: 25, carbs_g: 2.2, fat_g: 27, category: 'mlecne' },
  { id: 'parmazan', name: 'Parmazán', per: 100, defaultGrams: 15, kcal: 392, protein_g: 36, carbs_g: 3.2, fat_g: 26, category: 'mlecne' },
  { id: 'hermelin', name: 'Hermelín', per: 100, defaultGrams: 100, kcal: 305, protein_g: 18, carbs_g: 0.5, fat_g: 26, category: 'mlecne' },
  { id: 'niva', name: 'Niva', per: 100, defaultGrams: 30, kcal: 353, protein_g: 21, carbs_g: 2.3, fat_g: 29, category: 'mlecne' },
  { id: 'kefir', name: 'Kefír', per: 100, defaultGrams: 200, kcal: 51, protein_g: 3.4, carbs_g: 4.7, fat_g: 1.5, category: 'mlecne' },

  // NÁPOJE — doplnění
  { id: 'voda', name: 'Voda', per: 100, defaultGrams: 250, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, category: 'napoj' },
  { id: 'caj', name: 'Čaj černý/bylinný (bez cukru)', per: 100, defaultGrams: 250, kcal: 1, protein_g: 0, carbs_g: 0.2, fat_g: 0, category: 'napoj' },
  { id: 'protein-shake', name: 'Proteinový nápoj (mléko)', per: 100, defaultGrams: 300, kcal: 70, protein_g: 9, carbs_g: 5, fat_g: 1.5, category: 'napoj' },
  { id: 'rum', name: 'Rum 40%', per: 100, defaultGrams: 40, kcal: 230, protein_g: 0, carbs_g: 0, fat_g: 0, category: 'napoj' },
  { id: 'vino-cervene', name: 'Víno červené suché', per: 100, defaultGrams: 200, kcal: 85, protein_g: 0.1, carbs_g: 2.6, fat_g: 0, category: 'napoj' },

  // SNACKY — doplnění
  { id: 'rohlik-protein', name: 'Proteinová tyčinka', per: 100, defaultGrams: 60, kcal: 380, protein_g: 30, carbs_g: 30, fat_g: 12, category: 'snack' },
  { id: 'oplatka', name: 'Horalka oplatka', per: 100, defaultGrams: 50, kcal: 510, protein_g: 6, carbs_g: 60, fat_g: 27, category: 'snack' },
  { id: 'arasidy', name: 'Arašídy pražené', per: 100, defaultGrams: 30, kcal: 567, protein_g: 26, carbs_g: 16, fat_g: 49, category: 'snack' },
  { id: 'kesu', name: 'Kešu ořechy', per: 100, defaultGrams: 30, kcal: 553, protein_g: 18, carbs_g: 30, fat_g: 44, category: 'snack' },
  { id: 'popcorn', name: 'Popcorn (bez tuku)', per: 100, defaultGrams: 30, kcal: 387, protein_g: 13, carbs_g: 78, fat_g: 5, category: 'snack' },
  { id: 'med', name: 'Med', per: 100, defaultGrams: 20, kcal: 304, protein_g: 0.3, carbs_g: 82, fat_g: 0, category: 'jine' },
  { id: 'marmelada', name: 'Marmeláda meruňková', per: 100, defaultGrams: 20, kcal: 250, protein_g: 0.4, carbs_g: 60, fat_g: 0.1, category: 'jine' },
  { id: 'olej-oliv', name: 'Olivový olej', per: 100, defaultGrams: 10, kcal: 884, protein_g: 0, carbs_g: 0, fat_g: 100, category: 'jine' },

  // ČESKÁ KLASIKA — kompletní porce
  { id: 'svickova', name: 'Svíčková na smetaně s knedlíkem', per: 100, defaultGrams: 450, kcal: 175, protein_g: 9, carbs_g: 18, fat_g: 7.5, category: 'hlavni', tags: ['svickova', 'knedliky', 'omacka'] },
  { id: 'gulas-knedlik', name: 'Hovězí guláš s knedlíkem', per: 100, defaultGrams: 400, kcal: 178, protein_g: 11, carbs_g: 18, fat_g: 6.5, category: 'hlavni', tags: ['gulas', 'knedliky'] },
  { id: 'rizek-brambor', name: 'Vepřový řízek s bramborovou kaší', per: 100, defaultGrams: 400, kcal: 220, protein_g: 13, carbs_g: 22, fat_g: 9, category: 'hlavni', tags: ['rizek', 'smazene'] },
  { id: 'rizek-hranolky', name: 'Vepřový řízek s hranolky', per: 100, defaultGrams: 400, kcal: 270, protein_g: 12, carbs_g: 26, fat_g: 13, category: 'hlavni', tags: ['rizek', 'hranolky'] },
  { id: 'kuretci-rizek', name: 'Kuřecí řízek s bramborem', per: 100, defaultGrams: 400, kcal: 195, protein_g: 16, carbs_g: 18, fat_g: 7, category: 'hlavni', tags: ['kureci', 'rizek'] },
  { id: 'smazak', name: 'Smažený sýr s hranolky a tatarkou', per: 100, defaultGrams: 400, kcal: 285, protein_g: 11, carbs_g: 22, fat_g: 17, category: 'hlavni', tags: ['smazak', 'syr'] },
  { id: 'vepro-knedlo', name: 'Vepřo-knedlo-zelo', per: 100, defaultGrams: 450, kcal: 195, protein_g: 11, carbs_g: 18, fat_g: 9, category: 'hlavni', tags: ['veprove', 'knedliky', 'zeli'] },
  { id: 'kureci-paprika', name: 'Kuřecí na paprice s těstovinami', per: 100, defaultGrams: 400, kcal: 145, protein_g: 11, carbs_g: 14, fat_g: 4.5, category: 'hlavni', tags: ['kureci', 'paprika'] },
  { id: 'segedin', name: 'Segedínský guláš s knedlíkem', per: 100, defaultGrams: 400, kcal: 165, protein_g: 8, carbs_g: 17, fat_g: 7, category: 'hlavni', tags: ['gulas', 'segedin'] },
  { id: 'spagety-bolo', name: 'Špagety bolognese', per: 100, defaultGrams: 350, kcal: 155, protein_g: 7, carbs_g: 19, fat_g: 5.5, category: 'hlavni', tags: ['spagety', 'testoviny', 'bolognese'] },
  { id: 'spagety-carb', name: 'Špagety carbonara', per: 100, defaultGrams: 350, kcal: 220, protein_g: 9, carbs_g: 22, fat_g: 11, category: 'hlavni', tags: ['spagety', 'testoviny', 'carbonara'] },
  { id: 'lasagne', name: 'Lasagne hovězí', per: 100, defaultGrams: 350, kcal: 175, protein_g: 9, carbs_g: 16, fat_g: 8, category: 'hlavni', tags: ['lasagne', 'testoviny'] },
  { id: 'risotto-kureci', name: 'Kuřecí rizoto', per: 100, defaultGrams: 350, kcal: 145, protein_g: 8, carbs_g: 22, fat_g: 3.5, category: 'hlavni', tags: ['rizoto', 'kureci'] },
  { id: 'guacha', name: 'Gulášová polévka', per: 100, defaultGrams: 350, kcal: 75, protein_g: 4.5, carbs_g: 6, fat_g: 3.5, category: 'hlavni', tags: ['polevka', 'gulasovka'] },
  { id: 'kulajda', name: 'Kulajda', per: 100, defaultGrams: 350, kcal: 70, protein_g: 2.5, carbs_g: 7, fat_g: 3.5, category: 'hlavni', tags: ['polevka'] },
  { id: 'bramboracka', name: 'Bramboračka', per: 100, defaultGrams: 350, kcal: 60, protein_g: 1.8, carbs_g: 9, fat_g: 1.8, category: 'hlavni', tags: ['polevka'] },
  { id: 'cocka-polevka', name: 'Čočková polévka', per: 100, defaultGrams: 350, kcal: 90, protein_g: 5, carbs_g: 12, fat_g: 2, category: 'hlavni', tags: ['polevka', 'cocka'] },
  { id: 'kureci-vyvar', name: 'Kuřecí vývar s nudlemi', per: 100, defaultGrams: 350, kcal: 35, protein_g: 2, carbs_g: 5, fat_g: 0.6, category: 'hlavni', tags: ['polevka', 'vyvar'] },
  { id: 'cocka-naky', name: 'Čočka na kyselo s vejcem', per: 100, defaultGrams: 350, kcal: 130, protein_g: 8, carbs_g: 18, fat_g: 3, category: 'hlavni', tags: ['cocka'] },
  { id: 'halusky', name: 'Bryndzové halušky', per: 100, defaultGrams: 350, kcal: 195, protein_g: 8, carbs_g: 25, fat_g: 7, category: 'hlavni', tags: ['halusky', 'bryndza'] },
  { id: 'kureci-curry', name: 'Kuřecí curry s rýží', per: 100, defaultGrams: 400, kcal: 170, protein_g: 10, carbs_g: 18, fat_g: 6, category: 'hlavni', tags: ['curry', 'kureci'] },
  { id: 'tatarak', name: 'Tatarský biftek (200g) s topinkami', per: 100, defaultGrams: 350, kcal: 220, protein_g: 14, carbs_g: 20, fat_g: 9, category: 'hlavni', tags: ['tatarak', 'biftek'] },
  { id: 'rostena-cibulka', name: 'Hovězí roštěná na cibulce s rýží', per: 100, defaultGrams: 400, kcal: 165, protein_g: 12, carbs_g: 16, fat_g: 6, category: 'hlavni', tags: ['rostena', 'hovezi', 'cibulka', 'rostenka'] },
  { id: 'rostena-prirodni', name: 'Hovězí roštěná přírodní (maso)', per: 100, defaultGrams: 180, kcal: 210, protein_g: 24, carbs_g: 1, fat_g: 12, category: 'maso', tags: ['rostena', 'hovezi', 'rostenka', 'prirodni'] },
  { id: 'spanel-ptacek', name: 'Španělský ptáček s rýží', per: 100, defaultGrams: 400, kcal: 175, protein_g: 12, carbs_g: 14, fat_g: 8, category: 'hlavni', tags: ['ptacek', 'spanel', 'hovezi'] },
  { id: 'znojem-prazsk-pec', name: 'Znojemská pečeně s knedlíkem', per: 100, defaultGrams: 400, kcal: 180, protein_g: 11, carbs_g: 17, fat_g: 8, category: 'hlavni', tags: ['pecene', 'znojemska', 'hovezi'] },
  { id: 'sunkofleky', name: 'Šunkofleky', per: 100, defaultGrams: 350, kcal: 195, protein_g: 11, carbs_g: 20, fat_g: 8, category: 'hlavni', tags: ['sunkofleky', 'sunka', 'testoviny'] },
  { id: 'kapr-brambor', name: 'Smažený kapr s bramborovým salátem', per: 100, defaultGrams: 400, kcal: 220, protein_g: 12, carbs_g: 18, fat_g: 12, category: 'hlavni', tags: ['kapr', 'ryba', 'brambory'] },
  { id: 'kachna-knedlo', name: 'Pečená kachna se zelím a knedlíkem', per: 100, defaultGrams: 450, kcal: 240, protein_g: 13, carbs_g: 18, fat_g: 13, category: 'hlavni', tags: ['kachna', 'zeli', 'knedliky'] },
  { id: 'krkovicka-gril', name: 'Vepřová krkovička grilovaná', per: 100, defaultGrams: 200, kcal: 290, protein_g: 22, carbs_g: 0, fat_g: 22, category: 'maso', tags: ['krkovicka', 'gril', 'veprove'] },
  { id: 'plnena-paprika', name: 'Plněná paprika s rajskou omáčkou', per: 100, defaultGrams: 400, kcal: 110, protein_g: 6, carbs_g: 12, fat_g: 4, category: 'hlavni', tags: ['paprika', 'plnena', 'rajska'] },
  { id: 'rajska-omacka', name: 'Hovězí na rajské omáčce s knedlíkem', per: 100, defaultGrams: 400, kcal: 155, protein_g: 9, carbs_g: 17, fat_g: 5.5, category: 'hlavni', tags: ['rajska', 'omacka', 'hovezi'] },
  { id: 'kopr-omacka', name: 'Koprová omáčka s vejcem a knedlíkem', per: 100, defaultGrams: 400, kcal: 145, protein_g: 6, carbs_g: 18, fat_g: 5, category: 'hlavni', tags: ['koprovka', 'omacka', 'kopr'] },
  { id: 'cesnek-omacka', name: 'Česneková polévka', per: 100, defaultGrams: 350, kcal: 65, protein_g: 2.5, carbs_g: 7, fat_g: 3, category: 'hlavni', tags: ['polevka', 'cesnekova', 'cesnek'] },
  { id: 'drsteky', name: 'Dršťková polévka', per: 100, defaultGrams: 350, kcal: 90, protein_g: 7, carbs_g: 6, fat_g: 4, category: 'hlavni', tags: ['polevka', 'drstkovka'] },
  { id: 'sviatova-polevka', name: 'Hovězí vývar s játrovými knedlíčky', per: 100, defaultGrams: 350, kcal: 50, protein_g: 3, carbs_g: 5, fat_g: 1.5, category: 'hlavni', tags: ['polevka', 'vyvar', 'jatrove', 'knedlicky'] },
  { id: 'rizoto-houby', name: 'Houbové rizoto', per: 100, defaultGrams: 350, kcal: 130, protein_g: 4, carbs_g: 22, fat_g: 3, category: 'hlavni', tags: ['rizoto', 'houby'] },
  { id: 'cocka-bok', name: 'Čočka na kyselo s uzeným', per: 100, defaultGrams: 350, kcal: 145, protein_g: 9, carbs_g: 16, fat_g: 5, category: 'hlavni', tags: ['cocka', 'uzene'] },
  { id: 'losos-rize', name: 'Losos pečený s rýží a zeleninou', per: 100, defaultGrams: 380, kcal: 175, protein_g: 14, carbs_g: 14, fat_g: 7, category: 'hlavni', tags: ['losos', 'ryba'] },
  { id: 'tunak-salat', name: 'Tuňákový salát s vejcem', per: 100, defaultGrams: 280, kcal: 130, protein_g: 12, carbs_g: 4, fat_g: 8, category: 'hlavni', tags: ['tunak', 'salat'] },
  { id: 'cesnak-pol-syr', name: 'Česnečka se sýrem', per: 100, defaultGrams: 350, kcal: 80, protein_g: 3, carbs_g: 7, fat_g: 4.5, category: 'hlavni', tags: ['polevka', 'cesnecka'] },
  { id: 'pizza-margh', name: 'Pizza Margherita (28cm)', per: 100, defaultGrams: 350, kcal: 245, protein_g: 11, carbs_g: 30, fat_g: 9, category: 'hlavni', tags: ['pizza', 'margherita'] },
  { id: 'pizza-salami', name: 'Pizza salámová', per: 100, defaultGrams: 350, kcal: 280, protein_g: 12, carbs_g: 30, fat_g: 12, category: 'hlavni', tags: ['pizza', 'salam'] },
  { id: 'pizza-hawai', name: 'Pizza Hawai (šunka, ananas)', per: 100, defaultGrams: 350, kcal: 250, protein_g: 11, carbs_g: 32, fat_g: 8, category: 'hlavni', tags: ['pizza', 'hawai'] },

  // FAST FOOD — McDonald's
  { id: 'mac-bigmac', name: 'McDonald\'s Big Mac', per: 100, defaultGrams: 217, kcal: 240, protein_g: 11.5, carbs_g: 20, fat_g: 12.5, category: 'hlavni', tags: ['mcdonalds', 'mac', 'burger'] },
  { id: 'mac-mcchicken', name: 'McDonald\'s McChicken', per: 100, defaultGrams: 156, kcal: 248, protein_g: 11, carbs_g: 25, fat_g: 11, category: 'hlavni', tags: ['mcdonalds', 'kureci'] },
  { id: 'mac-cheese', name: 'McDonald\'s Cheeseburger', per: 100, defaultGrams: 119, kcal: 250, protein_g: 12, carbs_g: 26, fat_g: 10, category: 'hlavni', tags: ['mcdonalds', 'burger'] },
  { id: 'mac-quarter', name: 'McDonald\'s Quarter Pounder', per: 100, defaultGrams: 199, kcal: 257, protein_g: 14, carbs_g: 17, fat_g: 14, category: 'hlavni', tags: ['mcdonalds', 'burger'] },
  { id: 'mac-fries-m', name: 'McDonald\'s hranolky střední', per: 100, defaultGrams: 117, kcal: 320, protein_g: 4, carbs_g: 41, fat_g: 16, category: 'priloha', tags: ['mcdonalds', 'hranolky'] },
  { id: 'mac-fries-l', name: 'McDonald\'s hranolky velké', per: 100, defaultGrams: 154, kcal: 320, protein_g: 4, carbs_g: 41, fat_g: 16, category: 'priloha', tags: ['mcdonalds', 'hranolky'] },
  { id: 'mac-nug6', name: 'McDonald\'s McNuggets 6 ks', per: 100, defaultGrams: 102, kcal: 257, protein_g: 14, carbs_g: 16, fat_g: 16, category: 'hlavni', tags: ['mcdonalds', 'mcnuggets'] },
  { id: 'mac-nug9', name: 'McDonald\'s McNuggets 9 ks', per: 100, defaultGrams: 153, kcal: 257, protein_g: 14, carbs_g: 16, fat_g: 16, category: 'hlavni', tags: ['mcdonalds', 'mcnuggets'] },
  { id: 'mac-mcwrap', name: 'McDonald\'s McWrap kuřecí', per: 100, defaultGrams: 240, kcal: 200, protein_g: 9, carbs_g: 22, fat_g: 8, category: 'hlavni', tags: ['mcdonalds', 'wrap'] },
  { id: 'mac-mcflurry', name: 'McDonald\'s McFlurry M&M', per: 100, defaultGrams: 175, kcal: 200, protein_g: 4, carbs_g: 30, fat_g: 7, category: 'snack', tags: ['mcdonalds', 'zmrzlina', 'mcflurry'] },
  { id: 'mac-snidane-egg', name: 'McDonald\'s Egg McMuffin', per: 100, defaultGrams: 138, kcal: 217, protein_g: 12, carbs_g: 21, fat_g: 9, category: 'hlavni', tags: ['mcdonalds', 'snidane', 'mcmuffin'] },

  // KFC
  { id: 'kfc-original', name: 'KFC Original kuře (1 ks stehno)', per: 100, defaultGrams: 130, kcal: 256, protein_g: 24, carbs_g: 8, fat_g: 15, category: 'hlavni', tags: ['kfc', 'kureci'] },
  { id: 'kfc-twister', name: 'KFC Twister', per: 100, defaultGrams: 215, kcal: 245, protein_g: 11, carbs_g: 20, fat_g: 13, category: 'hlavni', tags: ['kfc', 'twister', 'wrap'] },
  { id: 'kfc-zinger', name: 'KFC Zinger Burger', per: 100, defaultGrams: 215, kcal: 245, protein_g: 12, carbs_g: 22, fat_g: 12, category: 'hlavni', tags: ['kfc', 'zinger', 'burger'] },
  { id: 'kfc-hotwings', name: 'KFC Hot Wings (5 ks)', per: 100, defaultGrams: 100, kcal: 270, protein_g: 18, carbs_g: 8, fat_g: 19, category: 'hlavni', tags: ['kfc', 'wings'] },
  { id: 'kfc-popcorn', name: 'KFC Popcorn Chicken', per: 100, defaultGrams: 130, kcal: 290, protein_g: 18, carbs_g: 18, fat_g: 17, category: 'hlavni', tags: ['kfc', 'popcorn', 'kureci'] },
  { id: 'kfc-fries', name: 'KFC hranolky', per: 100, defaultGrams: 110, kcal: 280, protein_g: 4, carbs_g: 36, fat_g: 13, category: 'priloha', tags: ['kfc', 'hranolky'] },

  // BURGER KING
  { id: 'bk-whopper', name: 'Burger King Whopper', per: 100, defaultGrams: 290, kcal: 230, protein_g: 9, carbs_g: 18, fat_g: 13, category: 'hlavni', tags: ['burger king', 'bk', 'whopper'] },
  { id: 'bk-cheese', name: 'Burger King Cheeseburger', per: 100, defaultGrams: 130, kcal: 250, protein_g: 12, carbs_g: 24, fat_g: 11, category: 'hlavni', tags: ['burger king', 'bk'] },
  { id: 'bk-chickking', name: 'Burger King Chicken King', per: 100, defaultGrams: 230, kcal: 230, protein_g: 11, carbs_g: 24, fat_g: 11, category: 'hlavni', tags: ['burger king', 'bk', 'kureci'] },

  // SUBWAY
  { id: 'sub-ital', name: 'Subway Italian BMT (30cm)', per: 100, defaultGrams: 250, kcal: 220, protein_g: 11, carbs_g: 22, fat_g: 10, category: 'hlavni', tags: ['subway', 'sandwich'] },
  { id: 'sub-tuna', name: 'Subway Tuna (30cm)', per: 100, defaultGrams: 250, kcal: 235, protein_g: 9, carbs_g: 20, fat_g: 13, category: 'hlavni', tags: ['subway', 'tunak'] },
  { id: 'sub-turkey', name: 'Subway Turkey (30cm)', per: 100, defaultGrams: 230, kcal: 175, protein_g: 12, carbs_g: 22, fat_g: 4, category: 'hlavni', tags: ['subway', 'krocan'] },

  // ASIJSKÁ KUCHYNĚ
  { id: 'sushi-cali', name: 'Sushi California roll (8 ks)', per: 100, defaultGrams: 200, kcal: 130, protein_g: 5, carbs_g: 22, fat_g: 3, category: 'hlavni', tags: ['sushi', 'california'] },
  { id: 'sushi-nigiri', name: 'Sushi Nigiri (1 ks)', per: 100, defaultGrams: 30, kcal: 140, protein_g: 8, carbs_g: 22, fat_g: 1, category: 'hlavni', tags: ['sushi', 'nigiri'] },
  { id: 'sushi-maki', name: 'Sushi Maki losos (8 ks)', per: 100, defaultGrams: 180, kcal: 145, protein_g: 6, carbs_g: 24, fat_g: 3, category: 'hlavni', tags: ['sushi', 'maki', 'losos'] },
  { id: 'pho-bo', name: 'Pho Bo (vietnamská polévka)', per: 100, defaultGrams: 500, kcal: 50, protein_g: 4, carbs_g: 7, fat_g: 1, category: 'hlavni', tags: ['pho', 'vietnamska'] },
  { id: 'kuretci-num', name: 'Kuřecí Nudle (Bun ga nuong)', per: 100, defaultGrams: 400, kcal: 140, protein_g: 8, carbs_g: 22, fat_g: 2.5, category: 'hlavni', tags: ['vietnamska', 'nudle', 'bun'] },
  { id: 'pad-thai', name: 'Pad Thai s kuřetem', per: 100, defaultGrams: 400, kcal: 175, protein_g: 9, carbs_g: 22, fat_g: 6, category: 'hlavni', tags: ['thajska', 'nudle'] },
  { id: 'kuretci-cina', name: 'Kuřecí na čínský způsob s rýží', per: 100, defaultGrams: 400, kcal: 145, protein_g: 9, carbs_g: 18, fat_g: 4, category: 'hlavni', tags: ['cinska'] },

  // SNÍDANĚ a CUKRÁRNA
  { id: 'palacinka-nut', name: 'Palačinky s nutellou', per: 100, defaultGrams: 200, kcal: 290, protein_g: 6, carbs_g: 38, fat_g: 13, category: 'jine', tags: ['palacinky', 'nutella'] },
  { id: 'palacinka-tvar', name: 'Palačinky s tvarohem', per: 100, defaultGrams: 200, kcal: 200, protein_g: 9, carbs_g: 25, fat_g: 7, category: 'jine', tags: ['palacinky', 'tvaroh'] },
  { id: 'lipance', name: 'Lívance s povidly', per: 100, defaultGrams: 200, kcal: 210, protein_g: 6, carbs_g: 32, fat_g: 6, category: 'jine', tags: ['livance'] },
  { id: 'vafle', name: 'Vafle se šlehačkou', per: 100, defaultGrams: 200, kcal: 290, protein_g: 7, carbs_g: 35, fat_g: 14, category: 'jine', tags: ['vafle', 'waffle'] },
  { id: 'french-toast', name: 'Vajíčková topinka (French toast)', per: 100, defaultGrams: 150, kcal: 230, protein_g: 8, carbs_g: 26, fat_g: 10, category: 'jine', tags: ['toast', 'snidane'] },
  { id: 'donut-glaze', name: 'Donut glazovaný', per: 100, defaultGrams: 60, kcal: 425, protein_g: 5, carbs_g: 51, fat_g: 22, category: 'snack', tags: ['donut'] },
  { id: 'donut-choco', name: 'Donut čokoládový', per: 100, defaultGrams: 70, kcal: 450, protein_g: 5, carbs_g: 50, fat_g: 25, category: 'snack', tags: ['donut'] },
  { id: 'eclair', name: 'Eclair s krémem', per: 100, defaultGrams: 80, kcal: 300, protein_g: 5, carbs_g: 28, fat_g: 19, category: 'snack', tags: ['eclair', 'zakusek'] },
  { id: 'tiramisu', name: 'Tiramisu', per: 100, defaultGrams: 130, kcal: 290, protein_g: 5, carbs_g: 32, fat_g: 16, category: 'snack', tags: ['tiramisu', 'dezert'] },
  { id: 'cheesecake', name: 'Cheesecake', per: 100, defaultGrams: 130, kcal: 320, protein_g: 6, carbs_g: 26, fat_g: 22, category: 'snack', tags: ['cheesecake', 'dezert'] },
  { id: 'brownie', name: 'Brownie', per: 100, defaultGrams: 80, kcal: 470, protein_g: 6, carbs_g: 50, fat_g: 28, category: 'snack', tags: ['brownie'] },
  { id: 'muffin-blueb', name: 'Muffin borůvkový', per: 100, defaultGrams: 100, kcal: 380, protein_g: 5, carbs_g: 50, fat_g: 18, category: 'snack', tags: ['muffin'] },
  { id: 'muffin-choco', name: 'Muffin čokoládový', per: 100, defaultGrams: 100, kcal: 410, protein_g: 5, carbs_g: 52, fat_g: 20, category: 'snack', tags: ['muffin'] },
  { id: 'cinnamon', name: 'Skořicový šnek (cinnamon roll)', per: 100, defaultGrams: 110, kcal: 410, protein_g: 7, carbs_g: 50, fat_g: 20, category: 'snack', tags: ['skoricovy', 'cinnamon'] },
  { id: 'kolac-tvarohy', name: 'Tvarohový koláč', per: 100, defaultGrams: 100, kcal: 280, protein_g: 7, carbs_g: 30, fat_g: 14, category: 'snack', tags: ['kolac', 'tvarohovy'] },
  { id: 'vanocka', name: 'Vánočka', per: 100, defaultGrams: 80, kcal: 360, protein_g: 9, carbs_g: 53, fat_g: 12, category: 'snack', tags: ['vanocka'] },
  { id: 'medovnik', name: 'Medovník', per: 100, defaultGrams: 130, kcal: 380, protein_g: 6, carbs_g: 45, fat_g: 19, category: 'snack', tags: ['medovnik'] },
  { id: 'strudl', name: 'Jablečný štrúdl', per: 100, defaultGrams: 150, kcal: 245, protein_g: 3, carbs_g: 31, fat_g: 12, category: 'snack', tags: ['strudl', 'zavin'] },
  { id: 'bagel', name: 'Bagel s krémovým sýrem', per: 100, defaultGrams: 150, kcal: 290, protein_g: 9, carbs_g: 35, fat_g: 13, category: 'jine', tags: ['bagel'] },
  { id: 'musli-bowl', name: 'Müsli mísa (jogurt, ovoce, ovesné vločky)', per: 100, defaultGrams: 350, kcal: 130, protein_g: 5, carbs_g: 22, fat_g: 3, category: 'jine', tags: ['musli', 'bowl', 'snidane'] },
  { id: 'smoothie-bowl', name: 'Smoothie bowl s ovocem a granolou', per: 100, defaultGrams: 350, kcal: 110, protein_g: 3, carbs_g: 20, fat_g: 2, category: 'jine', tags: ['smoothie', 'bowl'] },
  { id: 'avo-toast', name: 'Avocado toast s vejcem', per: 100, defaultGrams: 200, kcal: 220, protein_g: 8, carbs_g: 18, fat_g: 13, category: 'jine', tags: ['avokadovy', 'toast'] },
  { id: 'shakshuka', name: 'Shakshuka', per: 100, defaultGrams: 350, kcal: 95, protein_g: 5, carbs_g: 6, fat_g: 6, category: 'jine', tags: ['shakshuka'] },

  // PEČIVO doplnění
  { id: 'wrap-tortilla', name: 'Wrap kuřecí (tortilla)', per: 100, defaultGrams: 250, kcal: 215, protein_g: 11, carbs_g: 22, fat_g: 9, category: 'hlavni', tags: ['wrap'] },
  { id: 'panini', name: 'Panini se sýrem a šunkou', per: 100, defaultGrams: 200, kcal: 280, protein_g: 14, carbs_g: 27, fat_g: 13, category: 'hlavni', tags: ['panini', 'sandwich'] },
  { id: 'baget-sunka', name: 'Bageta se šunkou a sýrem', per: 100, defaultGrams: 250, kcal: 270, protein_g: 12, carbs_g: 32, fat_g: 10, category: 'hlavni', tags: ['bageta'] },
  { id: 'kebab', name: 'Kebab v pita placce', per: 100, defaultGrams: 350, kcal: 215, protein_g: 11, carbs_g: 21, fat_g: 9, category: 'hlavni', tags: ['kebab'] },
  { id: 'kebab-talir', name: 'Kebab talíř (s rýží/hranolkami)', per: 100, defaultGrams: 450, kcal: 195, protein_g: 11, carbs_g: 19, fat_g: 8, category: 'hlavni', tags: ['kebab'] },

  // MASOVÉ DOPLNĚNÍ (porce)
  { id: 'krkovice-gril', name: 'Krkovička grilovaná', per: 100, defaultGrams: 200, kcal: 290, protein_g: 25, carbs_g: 0, fat_g: 21, category: 'maso', tags: ['krkovice', 'grilovana'] },
  { id: 'klobasa', name: 'Klobása grilovaná', per: 100, defaultGrams: 150, kcal: 320, protein_g: 14, carbs_g: 1, fat_g: 28, category: 'maso', tags: ['klobasa'] },
  { id: 'cevapcici', name: 'Čevapčiči (5 ks)', per: 100, defaultGrams: 200, kcal: 250, protein_g: 16, carbs_g: 4, fat_g: 19, category: 'maso', tags: ['cevapcici'] },
  { id: 'biftek', name: 'Hovězí biftek (rib eye)', per: 100, defaultGrams: 200, kcal: 270, protein_g: 24, carbs_g: 0, fat_g: 19, category: 'maso', tags: ['biftek', 'steak'] },
  { id: 'meatballs', name: 'Masové kuličky v rajčatovém ragú', per: 100, defaultGrams: 300, kcal: 175, protein_g: 11, carbs_g: 6, fat_g: 12, category: 'hlavni', tags: ['kulicky', 'meatballs'] },

  // RYBY a MOŘSKÉ PLODY
  { id: 'losos-pec', name: 'Losos pečený', per: 100, defaultGrams: 150, kcal: 220, protein_g: 22, carbs_g: 0, fat_g: 14, category: 'maso', tags: ['losos', 'ryba'] },
  { id: 'treska', name: 'Treska pečená', per: 100, defaultGrams: 150, kcal: 105, protein_g: 23, carbs_g: 0, fat_g: 1, category: 'maso', tags: ['treska', 'ryba'] },
  { id: 'fish-chips', name: 'Fish & Chips', per: 100, defaultGrams: 400, kcal: 230, protein_g: 11, carbs_g: 22, fat_g: 11, category: 'hlavni', tags: ['fish', 'chips', 'ryba'] },
  { id: 'krevety-gril', name: 'Krevety grilované', per: 100, defaultGrams: 150, kcal: 100, protein_g: 21, carbs_g: 0, fat_g: 1.5, category: 'maso', tags: ['krevety'] },

  // DOPLŇKY VEGGIE
  { id: 'tofu-gril', name: 'Tofu grilované', per: 100, defaultGrams: 150, kcal: 144, protein_g: 17, carbs_g: 3, fat_g: 8, category: 'jine', tags: ['tofu', 'veggie'] },
  { id: 'tempeh', name: 'Tempeh', per: 100, defaultGrams: 100, kcal: 192, protein_g: 19, carbs_g: 8, fat_g: 11, category: 'jine', tags: ['tempeh'] },
  { id: 'falafel', name: 'Falafel (5 ks)', per: 100, defaultGrams: 150, kcal: 333, protein_g: 13, carbs_g: 32, fat_g: 18, category: 'jine', tags: ['falafel'] },
  { id: 'hummus', name: 'Humus (cizrnová pomazánka)', per: 100, defaultGrams: 50, kcal: 235, protein_g: 8, carbs_g: 18, fat_g: 14, category: 'jine', tags: ['hummus', 'humus'] },

  // NÁPOJE doplnění
  { id: 'kakao', name: 'Kakao s mlékem', per: 100, defaultGrams: 250, kcal: 95, protein_g: 4, carbs_g: 12, fat_g: 4, category: 'napoj', tags: ['kakao'] },
  { id: 'late', name: 'Latte (mléko 1,5%)', per: 100, defaultGrams: 300, kcal: 50, protein_g: 3, carbs_g: 4.5, fat_g: 2, category: 'napoj', tags: ['late', 'kava'] },
  { id: 'capuc', name: 'Cappuccino', per: 100, defaultGrams: 200, kcal: 50, protein_g: 3, carbs_g: 4, fat_g: 2.5, category: 'napoj', tags: ['cappuccino', 'kava'] },
  { id: 'kava-mleko', name: 'Káva s mlékem', per: 100, defaultGrams: 200, kcal: 30, protein_g: 1.5, carbs_g: 2.5, fat_g: 1.5, category: 'napoj', tags: ['kava'] },
  { id: 'kava-cerna', name: 'Káva černá', per: 100, defaultGrams: 200, kcal: 2, protein_g: 0.1, carbs_g: 0, fat_g: 0, category: 'napoj', tags: ['kava'] },
  { id: 'kola', name: 'Coca-Cola', per: 100, defaultGrams: 330, kcal: 42, protein_g: 0, carbs_g: 10.6, fat_g: 0, category: 'napoj', tags: ['coca cola', 'kola'] },
  { id: 'kola-zero', name: 'Coca-Cola Zero', per: 100, defaultGrams: 330, kcal: 0.3, protein_g: 0, carbs_g: 0, fat_g: 0, category: 'napoj', tags: ['coca cola', 'zero'] },
  { id: 'sprite', name: 'Sprite', per: 100, defaultGrams: 330, kcal: 39, protein_g: 0, carbs_g: 9.7, fat_g: 0, category: 'napoj', tags: ['sprite'] },
  { id: 'fanta', name: 'Fanta pomerančová', per: 100, defaultGrams: 330, kcal: 47, protein_g: 0, carbs_g: 11.9, fat_g: 0, category: 'napoj', tags: ['fanta'] },
  { id: 'cofola', name: 'Kofola', per: 100, defaultGrams: 300, kcal: 37, protein_g: 0, carbs_g: 9.2, fat_g: 0, category: 'napoj', tags: ['kofola'] },
  { id: 'red-bull', name: 'Red Bull', per: 100, defaultGrams: 250, kcal: 45, protein_g: 0, carbs_g: 11, fat_g: 0, category: 'napoj', tags: ['red bull', 'energy'] },
  { id: 'pivo-12', name: 'Pivo 12° (světlý ležák)', per: 100, defaultGrams: 500, kcal: 43, protein_g: 0.5, carbs_g: 3.6, fat_g: 0, category: 'napoj', tags: ['pivo'] },
  { id: 'pivo-10', name: 'Pivo 10° (světlé výčepní)', per: 100, defaultGrams: 500, kcal: 36, protein_g: 0.4, carbs_g: 3.0, fat_g: 0, category: 'napoj', tags: ['pivo'] },
  { id: 'vino-bile', name: 'Víno bílé suché', per: 100, defaultGrams: 200, kcal: 82, protein_g: 0.1, carbs_g: 2.6, fat_g: 0, category: 'napoj', tags: ['vino'] },
  { id: 'sekt', name: 'Sekt', per: 100, defaultGrams: 150, kcal: 80, protein_g: 0.2, carbs_g: 4, fat_g: 0, category: 'napoj', tags: ['sekt'] },
  { id: 'mojito', name: 'Mojito', per: 100, defaultGrams: 250, kcal: 95, protein_g: 0, carbs_g: 11, fat_g: 0, category: 'napoj', tags: ['mojito'] },
  { id: 'aperol', name: 'Aperol Spritz', per: 100, defaultGrams: 250, kcal: 90, protein_g: 0, carbs_g: 12, fat_g: 0, category: 'napoj', tags: ['aperol', 'spritz'] },

  // SNACKY a SLADKOSTI
  { id: 'choc-mlec', name: 'Mléčná čokoláda', per: 100, defaultGrams: 30, kcal: 535, protein_g: 7.5, carbs_g: 59, fat_g: 30, category: 'snack', tags: ['cokolada'] },
  { id: 'choc-horka', name: 'Hořká čokoláda 70%', per: 100, defaultGrams: 30, kcal: 600, protein_g: 7, carbs_g: 46, fat_g: 43, category: 'snack', tags: ['cokolada'] },
  { id: 'snickers', name: 'Snickers tyčinka', per: 100, defaultGrams: 50, kcal: 488, protein_g: 8, carbs_g: 60, fat_g: 24, category: 'snack', tags: ['snickers', 'tycinka'] },
  { id: 'milky-way', name: 'Milky Way', per: 100, defaultGrams: 22, kcal: 449, protein_g: 4, carbs_g: 71, fat_g: 17, category: 'snack', tags: ['milky way'] },
  { id: 'mars', name: 'Mars tyčinka', per: 100, defaultGrams: 51, kcal: 449, protein_g: 4, carbs_g: 70, fat_g: 17, category: 'snack', tags: ['mars'] },
  { id: 'twix', name: 'Twix', per: 100, defaultGrams: 50, kcal: 502, protein_g: 5, carbs_g: 64, fat_g: 24, category: 'snack', tags: ['twix'] },
  { id: 'kitkat', name: 'KitKat', per: 100, defaultGrams: 41, kcal: 518, protein_g: 7, carbs_g: 60, fat_g: 27, category: 'snack', tags: ['kitkat'] },
  { id: 'oreo', name: 'Oreo (3 ks)', per: 100, defaultGrams: 33, kcal: 480, protein_g: 5, carbs_g: 71, fat_g: 20, category: 'snack', tags: ['oreo'] },
  { id: 'gum-bears', name: 'Haribo gumoví medvídci', per: 100, defaultGrams: 50, kcal: 343, protein_g: 6.9, carbs_g: 77, fat_g: 0, category: 'snack', tags: ['haribo', 'medvidci'] },
  { id: 'chips-lays', name: 'Chipsy Lay\'s solené', per: 100, defaultGrams: 40, kcal: 540, protein_g: 6, carbs_g: 53, fat_g: 33, category: 'snack', tags: ['chipsy', 'lays'] },
  { id: 'pringles', name: 'Pringles Original', per: 100, defaultGrams: 40, kcal: 533, protein_g: 4, carbs_g: 50, fat_g: 35, category: 'snack', tags: ['pringles', 'chipsy'] },
  { id: 'mandle', name: 'Mandle nepražené', per: 100, defaultGrams: 30, kcal: 579, protein_g: 21, carbs_g: 22, fat_g: 50, category: 'snack', tags: ['mandle'] },
  { id: 'vlassky-orech', name: 'Vlašské ořechy', per: 100, defaultGrams: 30, kcal: 654, protein_g: 15, carbs_g: 14, fat_g: 65, category: 'snack', tags: ['vlasske', 'orechy'] },
  { id: 'lisk-orech', name: 'Lískové ořechy', per: 100, defaultGrams: 30, kcal: 628, protein_g: 15, carbs_g: 17, fat_g: 61, category: 'snack', tags: ['lisk', 'orechy'] },
  { id: 'rozinky', name: 'Rozinky', per: 100, defaultGrams: 30, kcal: 299, protein_g: 3, carbs_g: 79, fat_g: 0.5, category: 'snack', tags: ['rozinky'] },
  { id: 'datle', name: 'Datle sušené', per: 100, defaultGrams: 30, kcal: 282, protein_g: 2.5, carbs_g: 75, fat_g: 0.4, category: 'snack', tags: ['datle'] },

  // MLÉČNÉ doplnění
  { id: 'jogurt-jahod', name: 'Jogurt jahodový (slazený)', per: 100, defaultGrams: 150, kcal: 95, protein_g: 3.5, carbs_g: 14, fat_g: 2.5, category: 'mlecne' },
  { id: 'jogurt-skyr', name: 'Skyr přírodní', per: 100, defaultGrams: 150, kcal: 63, protein_g: 11, carbs_g: 4, fat_g: 0.2, category: 'mlecne', tags: ['skyr'] },
  { id: 'cottage', name: 'Cottage cheese', per: 100, defaultGrams: 150, kcal: 98, protein_g: 11, carbs_g: 3.4, fat_g: 4.3, category: 'mlecne', tags: ['cottage'] },
  { id: 'kefir', name: 'Kefír (1,5%)', per: 100, defaultGrams: 250, kcal: 53, protein_g: 3.3, carbs_g: 5, fat_g: 1.5, category: 'mlecne', tags: ['kefir'] },
  { id: 'mozzarella', name: 'Mozzarella', per: 100, defaultGrams: 50, kcal: 245, protein_g: 18, carbs_g: 1, fat_g: 19, category: 'mlecne', tags: ['mozzarella'] },
  { id: 'feta', name: 'Feta sýr', per: 100, defaultGrams: 50, kcal: 264, protein_g: 14, carbs_g: 4, fat_g: 21, category: 'mlecne', tags: ['feta'] },
  { id: 'parmezan', name: 'Parmezán', per: 100, defaultGrams: 20, kcal: 392, protein_g: 36, carbs_g: 4, fat_g: 26, category: 'mlecne', tags: ['parmezan'] },
  { id: 'cheddar', name: 'Cheddar', per: 100, defaultGrams: 30, kcal: 402, protein_g: 25, carbs_g: 1.3, fat_g: 33, category: 'mlecne', tags: ['cheddar'] },
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Each query word must appear in the item's name or tags. Word-level AND
// match means "grilovaná krkovička" still finds "Vepřová krkovička grilovaná".
export function searchLocal(query: string): FoodItem[] {
  const words = norm(query.trim()).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return FOODS_DB.filter((f) => {
    const haystack = `${norm(f.name)} ${(f.tags ?? []).map(norm).join(' ')}`;
    return words.every((w) => haystack.includes(w));
  }).slice(0, 8);
}

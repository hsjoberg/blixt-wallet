export const NAMEDESC_SEPARATOR = ":  ";

export interface INameDesc {
  name: string | null;
  description: string;
}

export const setupDescription = (description: string, name: string | null) => {
  let d = description;
  if (name !== null) {
    d = name + ":  " + (description || "No invoice description");
  }
  return d;
}

export const extractDescription = (data: string): INameDesc => {
  const splitted = data.split(NAMEDESC_SEPARATOR);

  if (splitted.length === 1) {
    return {
      name: null,
      description: splitted[0],
    };
  }
  if (splitted.length === 2) {
    return {
      name: splitted[0],
      description: splitted[1],
    };
  }
  return {
    name: splitted[0],
    description: data.slice(splitted[0].length + NAMEDESC_SEPARATOR.length),
  };
}

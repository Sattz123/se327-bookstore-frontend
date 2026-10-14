export function categoryPresentation(name: string) {
  const key = name.toLowerCase().replace(/[^a-z]/g, '')
  if (key === 'fiction')
    return {
      kind: 'fiction',
      icon: 'book',
      image: 'fiction',
      description: 'Stories that transport you to other worlds.',
      tags: [],
    }
  if (key === 'nonfiction')
    return {
      kind: 'nonfiction',
      icon: 'journal',
      image: 'nonfiction',
      description: 'Real stories and ideas that shape how we think.',
      tags: [],
    }
  if (['children', 'childrensbooks', 'childrenbooks'].includes(key))
    return {
      kind: 'children',
      icon: 'smile',
      image: 'children',
      description: 'Young adult and coming-of-age tales for every reader.',
      tags: [],
    }
  if (['mystery', 'mysterythriller', 'mysteryandthriller'].includes(key))
    return {
      kind: 'mystery',
      icon: 'search',
      image: 'mystery',
      description: 'Dark vibes and unexpected twists keep you guessing until the end.',
      tags: ['Mystery', 'Thriller', 'Suspense'],
    }
  if (
    [
      'science',
      'sciencetech',
      'scienceandtech',
      'sciencetechnology',
      'scienceandtechnology',
    ].includes(key)
  )
    return {
      kind: 'science',
      icon: 'cpu',
      image: 'science',
      description: 'Explore how ideas shape the world through discovery and innovation.',
      tags: ['Science', 'Technology', 'Innovation'],
    }
  return {
    kind: 'other',
    icon: 'book',
    image: '',
    description: 'Discover your next great read on this shelf.',
    tags: [],
  }
}

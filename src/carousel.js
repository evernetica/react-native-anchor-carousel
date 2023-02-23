import React, {
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { Animated, StyleSheet, Dimensions, FlatList } from 'react-native';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {},
  itemContainer: { justifyContent: 'center' },
});

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

function useConstructor(callBack = () => { }) {
  const [hasBeenCalled, setHasBeenCalled] = useState(false);
  if (hasBeenCalled) {
    return;
  }
  callBack();
  setHasBeenCalled(true);
}

function Carousel(props, ref) {
  const {
    data = [],
    style = {},
    vertical = false,
    containerWidth = windowWidth,
    containerHeight = windowHeight,
    itemWidth = 0.9 * windowWidth,
    itemHeight = 0.9 * windowHeight,
    itemContainerStyle = {},
    separatorWidth = 10,
    minScrollDistance = 5,
    inActiveScale = 0.8,
    inActiveOpacity = 0.8,
    inverted = false,
    initialIndex = 0,
    bounces = true,
    showsHorizontalScrollIndicator = false,
    keyExtractor = (item, index) => index.toString(),
    renderItem = () => { },
    onScrollEnd = () => { },
    onScrollBeginDrag = () => { },
    onScrollEndDrag = () => { },
    ...otherProps
  } = props;
  const scrollViewRef = useRef(null);
  const currentIndexRef = useRef(initialIndex);
  const scrollXRef = useRef(0);
  const scrollYRef = useRef(0);
  const scrollXBeginRef = useRef(0);
  const scrollYBeginRef = useRef(0);
  const xOffsetRef = useRef(new Animated.Value(0));
  const yOffsetRef = useRef(new Animated.Value(0));
  const handleOnScrollRef = useRef(() => { });
  const halfContainerWidth = containerWidth / 2;
  const halfContainerHeight = containerHeight / 2;
  const halfItemWidth = itemWidth / 2;
  const halfItemHeight = itemHeight / 2;
  const itemTotalMarginBothSide = getItemTotalMarginBothSide();
  const containerStyle = [styles.container, { width: containerWidth, height: containerHeight }, style];
  const dataLength = data ? data.length : 0;

  useConstructor(() => {
    setScrollHandler();
  });

  useImperativeHandle(ref, () => ({
    currentIndex: currentIndexRef.current,
    scrollToIndex: scrollToIndex,
  }));

  function isLastItem(index) {
    return index === dataLength - 1;
  }

  function isFirstItem(index) {
    return index === 0;
  }

  function getItemLayout(data, index) {
    return {
      offset: getItemOffset(index),
      length: vertical ? itemHeight : itemWidth,
      index,
    };
  }

  function setScrollHandler() {
    handleOnScrollRef.current = Animated.event(
      [{ nativeEvent: { contentOffset: { x: xOffsetRef.current, y: yOffsetRef.current } } }],
      {
        useNativeDriver: true,
        listener: (event) => {
          scrollXRef.current = event.nativeEvent.contentOffset.x;
          scrollYRef.current = event.nativeEvent.contentOffset.y;
        },
      }
    );
  }

  function scrollToIndex(index) {
    if (index < 0 || index >= dataLength) {
      return;
    }
    currentIndexRef.current = index;
    onScrollEnd && onScrollEnd(data[index], index);

    setTimeout(() => {
      scrollViewRef.current &&
        scrollViewRef.current.scrollToOffset({
          offset: getItemOffset(index),
          animated: true,
        });
    });
  }

  function handleOnScrollBeginDrag() {
    onScrollBeginDrag && onScrollBeginDrag();
    scrollXBeginRef.current = scrollXRef.current;
    scrollYBeginRef.current = scrollYRef.current;
  }


  function handleOnScrollEndDrag() {
    if (vertical) {
      if (scrollYRef.current < 0) {
        return;
      }
    } else {
      if (scrollXRef.current < 0) {
        return;
      }
    }
    const scrollXDistance = scrollXRef.current - scrollXBeginRef.current;
    const scrollYDistance = scrollYRef.current - scrollYBeginRef.current;
    scrollXBeginRef.current = 0;
    scrollYBeginRef.current = 0;
    const scrollDistance = vertical ? scrollYDistance : scrollXDistance
    if (Math.abs(scrollDistance) < minScrollDistance) {
      scrollToIndex(currentIndexRef.current);
      return;
    }
    if (scrollDistance < 0) {
      onScrollEndDrag && onScrollEndDrag(currentIndexRef.current - 1);
      scrollToIndex(currentIndexRef.current - 1);
    } else {
      onScrollEndDrag && onScrollEndDrag(currentIndexRef.current + 1);
      scrollToIndex(currentIndexRef.current + 1);
    }
  }

  function getItemTotalMarginBothSide() {
    const compensatorOfSeparatorByScaleEffect = (1 - inActiveScale) * (vertical ? itemHeight : itemWidth);
    return separatorWidth - compensatorOfSeparatorByScaleEffect / 2;
  }

  function getItemOffset(index) {
    const verticalOffset = index * (itemHeight + itemTotalMarginBothSide) -
      (halfContainerHeight - halfItemHeight)
    const horizontalOffset = index * (itemWidth + itemTotalMarginBothSide) -
      (halfContainerWidth - halfItemWidth)

    return vertical ? verticalOffset : horizontalOffset;
  }

  function getAnimatedOffset(index) {
    if (isFirstItem(index)) {
      return vertical ? halfItemHeight : halfItemWidth;
    }
    if (isLastItem(index)) {
      return vertical ? containerHeight - halfItemHeight : containerWidth - halfItemWidth;
    }
    return vertical ? halfContainerHeight : halfContainerWidth;
  }

  function getMidPontInterpolate(index, animatedOffset) {
    const pontHorizontal = index * (itemWidth + itemTotalMarginBothSide) +
      halfItemWidth - animatedOffset

    const pontVertical = index * (itemHeight + itemTotalMarginBothSide) +
      halfItemHeight - animatedOffset

    return vertical ? pontVertical : pontHorizontal;
  }
  function getStartPontInterpolate(index, midPoint) {
    if (index === 1) {
      return 0;
    }
    if (isLastItem(index)) {
      const horizontalOffset = (
        (dataLength - 2) * (itemWidth + itemTotalMarginBothSide) +
        halfItemWidth - halfContainerWidth
      )
      const verticalOffset = (
        (dataLength - 2) * (itemHeight + itemTotalMarginBothSide) +
        halfItemHeight - halfContainerHeight
      )
      return vertical ? verticalOffset : horizontalOffset;
    }
    return midPoint - (vertical ? itemHeight : itemWidth) - itemTotalMarginBothSide;
  }

  function getEndPointInterpolate(index, midPoint) {
    if (isFirstItem(index)) {
      const pontHorizontal = itemWidth + itemTotalMarginBothSide + halfItemWidth - halfContainerWidth
      const pontVertical = itemHeight + itemTotalMarginBothSide + halfItemHeight - halfContainerHeight
      return vertical ? pontVertical : pontHorizontal;
    }
    if (index === dataLength - 2) {
      const pontHorizontal = (dataLength - 1) * (itemWidth + itemTotalMarginBothSide) +
        itemWidth - containerWidth
      const pontVertical = (dataLength - 1) * (itemHeight + itemTotalMarginBothSide) +
        itemHeight - containerHeight

      return vertical ? pontVertical : pontHorizontal;
    }
    return midPoint + (vertical ? itemHeight : itemWidth) + itemTotalMarginBothSide;
  }

  function getItemAnimatedStyle(index) {
    const animatedOffset = getAnimatedOffset(index);
    const midPoint = getMidPontInterpolate(index, animatedOffset);
    const startPoint = getStartPontInterpolate(index, midPoint);
    const endPoint = getEndPointInterpolate(index, midPoint);
    const opacityRef = vertical ? yOffsetRef : xOffsetRef
    const animatedOpacity = {
      opacity: opacityRef.current.interpolate({
        inputRange: [startPoint, midPoint, endPoint],
        outputRange: [inActiveOpacity, 1, inActiveOpacity],
      }),
    };
    const animatedScale = {
      transform: [
        {
          scale: opacityRef.current.interpolate({
            inputRange: [startPoint, midPoint, endPoint],
            outputRange: [inActiveScale, 1, inActiveScale],
          }),
        },
      ],
    };
    return { ...animatedOpacity, ...animatedScale };
  }

  function getItemMarginStyle(index) {
    const marginSingleItemSide = itemTotalMarginBothSide / 2;
    if (isFirstItem(index)) {
      return !!inverted
        ? { marginLeft: marginSingleItemSide }
        : { marginRight: marginSingleItemSide };
    }
    if (isLastItem(index)) {
      return !!inverted
        ? { marginRight: marginSingleItemSide }
        : { marginLeft: marginSingleItemSide };
    }
    return { marginHorizontal: marginSingleItemSide };
  }

  function renderItemContainer({ item, index }) {
    return (
      <Animated.View
        pointerEvents={'box-none'}
        style={[
          styles.itemContainer,
          itemContainerStyle,
          { width: itemWidth, height: itemHeight },
          getItemMarginStyle(index),
          getItemAnimatedStyle(index),
        ]}
      >
        {renderItem({ item, index })}
      </Animated.View>
    );
  }

  return (
    <AnimatedFlatList
      {...otherProps}
      ref={scrollViewRef}
      data={data}
      style={containerStyle}
      // horizontal={true}
      horizontal={!vertical}
      inverted={inverted}
      bounces={bounces}
      decelerationRate={0}
      initialScrollIndex={initialIndex}
      automaticallyAdjustContentInsets={false}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
      onScroll={handleOnScrollRef.current}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      renderItem={renderItemContainer}
      onScrollBeginDrag={handleOnScrollBeginDrag}
      onScrollEndDrag={handleOnScrollEndDrag}
    />
  );
}

export default forwardRef(Carousel);